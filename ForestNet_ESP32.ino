#include <DHT.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

/* =========================================
   FORESTNET - SENSOR MONITORING SYSTEM
   ========================================= */

/* ---------- HARDWARE PINS ---------- */
#define DHTPIN 4
#define DHTTYPE DHT22
#define MQ2_PIN 34
#define PIR_PIN 27

/* ---------- THRESHOLDS ---------- */
#define MQ2_THRESHOLD 500
#define TEMP_THRESHOLD 40

/* =========================================
   WIFI + FLASK BACKEND CONNECTION
   ========================================= */
const char* WIFI_SSID     = "Shanks";
const char* WIFI_PASSWORD = "trimman25";

// Current PC Local IP on active Wi-Fi network: 10.81.193.60
const char* TELEMETRY_ENDPOINT = "http://10.81.193.60:5000/api/telemetry";

const unsigned long WIFI_RETRY_INTERVAL = 10000;
unsigned long lastWifiRetry = 0;

/* ---------- OBJECTS ---------- */
DHT dht(DHTPIN, DHTTYPE);
TinyGPSPlus gps;
HardwareSerial gpsSerial(2);

/* ---------- ALERT VARIABLES ---------- */
bool alertActive = false;
bool previousMotionState = LOW;
bool currentMotionState = LOW;
unsigned long lastPrintTime = 0;
const unsigned long PRINT_INTERVAL = 2000;

/* =========================================
   WIFI CONNECT FUNCTION
   ========================================= */
void connectWiFi() {
  Serial.println();
  Serial.print("Connecting to WiFi: ");
  Serial.println(WIFI_SSID);
  WiFi.disconnect(true);
  delay(500);
  WiFi.mode(WIFI_STA);
  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("✓ WiFi connected. ESP32 IP address: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("✗ WiFi not connected yet. Will keep retrying in background.");
  }
}

/* =========================================
   SEND TELEMETRY TO FLASK BACKEND
   ========================================= */
void sendTelemetry(float temperature, float humidity, int gasValue,
                    bool motion, bool alert, const char* reason) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("⚠ Skipping upload — WiFi not connected");
    return;
  }

  HTTPClient http;
  http.begin(TELEMETRY_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.setTimeout(4000);
  http.setTimeout(5000);

  StaticJsonDocument<512> doc;
  doc["temperature"] = isnan(temperature) ? 0 : temperature;
  doc["humidity"]     = isnan(humidity) ? 0 : humidity;
  doc["smoke"]        = gasValue;
  doc["motion"]       = motion;
  doc["alert"]        = alert;
  doc["reason"]       = reason;

  if (gps.location.isValid()) {
    doc["lat"] = gps.location.lat();
    doc["lng"] = gps.location.lng();
  } else {
    doc["lat"] = 0;
    doc["lng"] = 0;
  }

  String payload;
  serializeJson(doc, payload);

  int responseCode = http.POST(payload);

  if (responseCode > 0) {
    Serial.print("→ Telemetry sent. Server responded: ");
    Serial.println(responseCode);
  } else {
    Serial.print("✗ Failed to send telemetry. Error: ");
    Serial.println(http.errorToString(responseCode));
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  Serial.println();
  Serial.println("==========================================");
  Serial.println("       FORESTNET SENSOR SYSTEM");
  Serial.println("==========================================");

  dht.begin();
  pinMode(PIR_PIN, INPUT);
  gpsSerial.begin(9600, SERIAL_8N1, 21, 22);

  Serial.println();
  Serial.println("Initializing HC-SR501 Motion Sensor...");
  Serial.println("Please do not move in front of the sensor.");
  Serial.println();

  delay(30000); // PIR sensor stabilization
  previousMotionState = digitalRead(PIR_PIN);

  Serial.println("✓ PIR Sensor Ready");
  Serial.println("✓ DHT22 Ready");
  Serial.println("✓ MQ-2 Ready");
  Serial.println("✓ GPS Monitoring Started");

  connectWiFi();

  Serial.println();
  Serial.println("ForestNet Monitoring Started");
  Serial.println("==========================================");
  Serial.println();
}

void loop() {
  // Keep WiFi Alive
  if (WiFi.status() != WL_CONNECTED && millis() - lastWifiRetry >= WIFI_RETRY_INTERVAL) {
    lastWifiRetry = millis();
    Serial.println("Reconnecting WiFi...");
    connectWiFi();
  }

  // Continuous GPS Reading
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // Motion Detection
  currentMotionState = digitalRead(PIR_PIN);

  if (currentMotionState == HIGH && previousMotionState == LOW) {
    Serial.println("\n🏃 MOTION DETECTED");

    if (!alertActive) {
      Serial.println("⚠ ALERT TRIGGERED");
      Serial.println("Trigger Reason: MOTION DETECTED");
      Serial.println("ALERT");

      alertActive = true;

      sendTelemetry(dht.readTemperature(), dht.readHumidity(),
                    analogRead(MQ2_PIN), true, true, "MOTION_DETECTED");
    }
  }

  previousMotionState = currentMotionState;

  // Sensor Read & Telemetry Every 2 Seconds
  if (millis() - lastPrintTime >= PRINT_INTERVAL) {
    lastPrintTime = millis();

    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();
    int gasValue = analogRead(MQ2_PIN);

    Serial.print("Temperature: ");
    if (isnan(temperature)) Serial.print("ERROR");
    else { Serial.print(temperature, 2); Serial.print(" °C"); }

    Serial.print("   Humidity: ");
    if (isnan(humidity)) Serial.print("ERROR");
    else { Serial.print(humidity, 2); Serial.print(" %"); }

    Serial.print("   Smoke Value: "); Serial.print(gasValue);
    Serial.print("   Motion: "); Serial.print(currentMotionState == HIGH ? "DETECTED" : "NO MOTION");

    if (gps.location.isValid()) {
      Serial.print("   Latitude: "); Serial.print(gps.location.lat(), 6);
      Serial.print("   Longitude: "); Serial.print(gps.location.lng(), 6);
    } else {
      Serial.print("   GPS: Waiting for signal...");
    }
    Serial.println();

    bool temperatureAlert = (!isnan(temperature) && temperature > TEMP_THRESHOLD);
    bool smokeAlert = (gasValue > MQ2_THRESHOLD);
    const char* triggerReason = "NORMAL";

    if ((temperatureAlert || smokeAlert) && !alertActive) {
      Serial.println("\n⚠ ALERT TRIGGERED");
      if (temperatureAlert) Serial.println("Trigger Reason: HIGH TEMPERATURE");
      if (smokeAlert) Serial.println("Trigger Reason: HIGH SMOKE");
      Serial.println("ALERT");

      alertActive = true;
    }

    if (temperatureAlert && smokeAlert) triggerReason = "HIGH_TEMPERATURE_AND_SMOKE";
    else if (temperatureAlert) triggerReason = "HIGH_TEMPERATURE";
    else if (smokeAlert) triggerReason = "HIGH_SMOKE";
    else if (currentMotionState == HIGH) triggerReason = "MOTION_DETECTED";

    bool temperatureNormal = (isnan(temperature) || temperature < 35);
    bool smokeNormal = (gasValue < 400);
    bool noMotion = (currentMotionState == LOW);

    if (alertActive && temperatureNormal && smokeNormal && noMotion) {
      Serial.println("System Reset — Monitoring Resumed");
      alertActive = false;
    }

    Serial.println("------------------------------------------");

    // Regular Telemetry Send to Flask
    sendTelemetry(temperature, humidity, gasValue,
                  currentMotionState == HIGH, alertActive, triggerReason);
  }
}
