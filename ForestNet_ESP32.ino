#include <DHT.h>
#include <TinyGPSPlus.h>
#include <HardwareSerial.h>
#include <WiFi.h>
#include <WiFiUdp.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>

/* ============================================================
   FORESTNET
   REAL-TIME ESP32 SENSOR NODE
   ============================================================ */


/* ============================================================
   HARDWARE CONFIGURATION
   ============================================================ */

#define DHTPIN 4
#define DHTTYPE DHT22

#define MQ2_PIN 34
#define PIR_PIN 27


/* ============================================================
   ALERT THRESHOLDS
   ============================================================ */

#define MQ2_THRESHOLD 500
#define TEMP_THRESHOLD 40.0


/* ============================================================
   WIFI CONFIGURATION
   ============================================================ */

const char* WIFI_SSID     = "Motorola edge 40";
const char* WIFI_PASSWORD = "Marvel@12345";

/*
   PC_IP and TELEMETRY_ENDPOINT are now dynamically populated 
   by the UDP discovery broadcast mechanism.
*/
String PC_IP = "";


/* ============================================================
   BACKEND CONFIGURATION
   ============================================================ */

const int SERVER_PORT = 5000;

String TELEMETRY_ENDPOINT = "";


/* ============================================================
   SYSTEM TIMING
   ============================================================ */

const unsigned long TELEMETRY_INTERVAL  = 2000;
const unsigned long WIFI_RETRY_INTERVAL = 10000;

unsigned long lastTelemetryTime = 0;
unsigned long lastWifiRetry     = 0;


/* ============================================================
   SENSOR OBJECTS
   ============================================================ */

DHT dht(DHTPIN, DHTTYPE);

TinyGPSPlus gps;

HardwareSerial gpsSerial(2);


/* ============================================================
   SYSTEM STATE
   ============================================================ */

bool alertActive         = false;
bool previousMotionState = LOW;
bool currentMotionState  = LOW;


/* ============================================================
   WIFI CONNECTION
   ============================================================ */

void connectWiFi() {

  Serial.println();
  Serial.println("==========================================");
  Serial.println("FORESTNET WIFI CONNECTION");
  Serial.println("==========================================");

  WiFi.mode(WIFI_STA);
  WiFi.disconnect();
  delay(500);

  Serial.print("Connecting to: ");
  Serial.println(WIFI_SSID);

  WiFi.begin(WIFI_SSID, WIFI_PASSWORD);

  unsigned long startAttempt = millis();

  while (WiFi.status() != WL_CONNECTED && millis() - startAttempt < 15000) {
    Serial.print(".");
    delay(500);
  }

  Serial.println();

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("OK WIFI CONNECTED");
    Serial.print("ESP32 IP: ");
    Serial.println(WiFi.localIP());
  }
  else {
    Serial.println("FAIL WIFI CONNECTION FAILED");
  }
}


/* ============================================================
   WIFI MAINTENANCE
   ============================================================ */

void maintainWiFi() {

  if (WiFi.status() == WL_CONNECTED) return;

  if (millis() - lastWifiRetry >= WIFI_RETRY_INTERVAL) {
    lastWifiRetry = millis();
    Serial.println("WiFi disconnected. Reconnecting...");
    connectWiFi();
  }
}


/* ============================================================
   UDP DISCOVERY
   ============================================================ */

WiFiUDP udp;

bool discoverBackend() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Cannot discover backend: WiFi disconnected");
    return false;
  }
  
  IPAddress local = WiFi.localIP();
  IPAddress broadcastIP = local;
  broadcastIP[3] = 255;
  
  Serial.print("Sending UDP discovery broadcast to ");
  Serial.print(broadcastIP);
  Serial.println(":5006");
  
  udp.beginPacket(broadcastIP, 5006);
  udp.print("FORESTNET_DISCOVER");
  udp.endPacket();
  
  unsigned long startWait = millis();
  while (millis() - startWait < 2000) {
    int packetSize = udp.parsePacket();
    if (packetSize) {
      char replyBuffer[255];
      int len = udp.read(replyBuffer, 254);
      if (len > 0) {
        replyBuffer[len] = '\0';
      }
      
      String reply = String(replyBuffer);
      reply.trim();
      
      if (reply == "FORESTNET_HERE") {
        PC_IP = udp.remoteIP().toString();
        TELEMETRY_ENDPOINT = "http://" + PC_IP + ":" + String(SERVER_PORT) + "/api/telemetry";
        
        Serial.println("OK BACKEND DISCOVERED!");
        Serial.print("New Backend IP: ");
        Serial.println(PC_IP);
        Serial.print("New Endpoint: ");
        Serial.println(TELEMETRY_ENDPOINT);
        return true;
      }
    }
    delay(10);
  }
  
  Serial.println("FAIL Discovery timeout. No reply received.");
  return false;
}


/* ============================================================
   SEND TELEMETRY TO FLASK BACKEND
   ============================================================ */

bool sendTelemetry(
  float temperature,
  float humidity,
  int   smokeValue,
  bool  motion,
  bool  alert,
  const char* reason
) {

  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("TELEMETRY SKIPPED: WiFi not connected");
    return false;
  }

  HTTPClient http;

  Serial.println();
  Serial.println("Sending telemetry...");
  Serial.print("Endpoint: ");
  Serial.println(TELEMETRY_ENDPOINT);

  http.begin(TELEMETRY_ENDPOINT);
  http.addHeader("Content-Type", "application/json");
  http.setConnectTimeout(5000);
  http.setTimeout(7000);

  StaticJsonDocument<512> doc;

  // Sensor Data
  if (isnan(temperature)) doc["temperature"] = nullptr;
  else                     doc["temperature"] = temperature;

  if (isnan(humidity))     doc["humidity"]    = nullptr;
  else                     doc["humidity"]    = humidity;

  doc["smoke"]  = smokeValue;
  doc["motion"] = motion;
  doc["alert"]  = alert;
  doc["reason"] = reason;

  // GPS Data
  if (gps.location.isValid()) {
    doc["lat"] = gps.location.lat();
    doc["lng"] = gps.location.lng();
  }
  else {
    doc["lat"] = nullptr;
    doc["lng"] = nullptr;
  }

  // Device Info
  doc["device"] = "FORESTNET_ESP32";
  doc["uptime"] = millis();

  String payload;
  serializeJson(doc, payload);

  Serial.print("Payload: ");
  Serial.println(payload);

  int responseCode = http.POST(payload);

  if (responseCode > 0) {
    Serial.print("OK SERVER RESPONSE: ");
    Serial.println(responseCode);
    String response = http.getString();
    if (response.length() > 0) {
      Serial.print("Server says: ");
      Serial.println(response);
    }
    http.end();
    return true;
  }

  Serial.print("FAIL TELEMETRY ERROR: ");
  Serial.println(http.errorToString(responseCode));
  http.end();
  
  Serial.println("Backend unreachable. Attempting UDP rediscovery...");
  discoverBackend();
  
  return false;
}


/* ============================================================
   TRIGGER ALERT
   ============================================================ */

void triggerAlert(
  const char* reason,
  float temperature,
  float humidity,
  int   smokeValue,
  bool  motion
) {

  if (alertActive) return;

  alertActive = true;

  Serial.println();
  Serial.println("==========================================");
  Serial.println("FORESTNET ALERT TRIGGERED");
  Serial.println("==========================================");
  Serial.print("Trigger Reason: ");
  Serial.println(reason);
  Serial.println("ALERT");

  // Send immediate alert telemetry to Flask backend
  // Flask backend will automatically trigger camera capture + AI analysis
  sendTelemetry(temperature, humidity, smokeValue, motion, true, reason);
}


/* ============================================================
   RESET ALERT
   ============================================================ */

void resetAlert() {

  if (!alertActive) return;

  alertActive = false;

  Serial.println();
  Serial.println("System Reset -- Monitoring Resumed");
  Serial.println("OK FORESTNET READY FOR NEXT INCIDENT");

  // Notify backend that alert is cleared
  float temp  = dht.readTemperature();
  float hum   = dht.readHumidity();
  int   smoke = analogRead(MQ2_PIN);
  sendTelemetry(temp, hum, smoke, false, false, "NORMAL");
}


/* ============================================================
   SETUP
   ============================================================ */

void setup() {

  Serial.begin(115200);
  delay(1000);

  Serial.println();
  Serial.println("==========================================");
  Serial.println("       FORESTNET SENSOR SYSTEM");
  Serial.println("==========================================");

  dht.begin();

  pinMode(PIR_PIN, INPUT);

  gpsSerial.begin(9600, SERIAL_8N1, 21, 22);

  Serial.println("Initializing PIR sensor...");
  Serial.println("Please keep area still for 30 seconds.");

  // HC-SR501 needs 30s to stabilize on first power-on
  delay(30000);

  previousMotionState = digitalRead(PIR_PIN);

  Serial.println("OK PIR READY");
  Serial.println("OK DHT22 READY");
  Serial.println("OK MQ-2 READY");
  Serial.println("OK GPS MONITORING STARTED");

  connectWiFi();

  Serial.println();
  Serial.println("==========================================");
  Serial.println("DISCOVERING BACKEND SERVER...");
  Serial.println("==========================================");
  while (!discoverBackend()) {
    delay(2000);
  }

  Serial.println();
  Serial.println("==========================================");
  Serial.println("FORESTNET MONITORING STARTED");
  Serial.println("==========================================");
}


/* ============================================================
   MAIN LOOP
   ============================================================ */

void loop() {

  // Keep WiFi alive
  maintainWiFi();

  // Feed GPS parser
  while (gpsSerial.available() > 0) {
    gps.encode(gpsSerial.read());
  }

  // PIR Motion Detection (rising edge only)
  currentMotionState = digitalRead(PIR_PIN);

  if (currentMotionState == HIGH && previousMotionState == LOW) {
    Serial.println();
    Serial.println("MOTION DETECTED");

    float temperature = dht.readTemperature();
    float humidity    = dht.readHumidity();
    int   smokeValue  = analogRead(MQ2_PIN);

    triggerAlert("MOTION_DETECTED", temperature, humidity, smokeValue, true);
  }

  previousMotionState = currentMotionState;

  // Periodic sensor telemetry every 2 seconds
  if (millis() - lastTelemetryTime >= TELEMETRY_INTERVAL) {
    lastTelemetryTime = millis();

    float humidity    = dht.readHumidity();
    float temperature = dht.readTemperature();
    int   smokeValue  = analogRead(MQ2_PIN);

    // Print sensor data
    Serial.println();
    Serial.println("---------- SENSOR DATA ----------");

    Serial.print("Temperature: ");
    if (isnan(temperature)) Serial.print("ERROR");
    else { Serial.print(temperature, 2); Serial.print(" C"); }

    Serial.print("   Humidity: ");
    if (isnan(humidity)) Serial.print("ERROR");
    else { Serial.print(humidity, 2); Serial.print(" %"); }

    Serial.print("   Smoke Value: ");
    Serial.print(smokeValue);

    Serial.print("   Motion: ");
    Serial.print(currentMotionState == HIGH ? "DETECTED" : "NO MOTION");

    if (gps.location.isValid()) {
      Serial.print("   Latitude: ");
      Serial.print(gps.location.lat(), 6);
      Serial.print("   Longitude: ");
      Serial.print(gps.location.lng(), 6);
    }
    else {
      Serial.print("   GPS: Waiting for signal...");
    }
    Serial.println();

    // Threshold analysis
    bool temperatureAlert = !isnan(temperature) && temperature > TEMP_THRESHOLD;
    bool smokeAlert       = smokeValue > MQ2_THRESHOLD;
    bool motionAlert      = currentMotionState == HIGH;

    const char* reason = "NORMAL";

    if      (temperatureAlert && smokeAlert) reason = "HIGH_TEMPERATURE_AND_SMOKE";
    else if (temperatureAlert)               reason = "HIGH_TEMPERATURE";
    else if (smokeAlert)                     reason = "HIGH_SMOKE";
    else if (motionAlert)                    reason = "MOTION_DETECTED";

    // Trigger alert if needed
    if ((temperatureAlert || smokeAlert || motionAlert) && !alertActive) {
      triggerAlert(reason, temperature, humidity, smokeValue, motionAlert);
    }

    // Reset alert when all conditions return to normal
    bool temperatureNormal = isnan(temperature) || temperature < 35;
    bool smokeNormal       = smokeValue < 400;
    bool noMotion          = currentMotionState == LOW;

    if (alertActive && temperatureNormal && smokeNormal && noMotion) {
      resetAlert();
    }

    // Send regular telemetry to Flask backend
    sendTelemetry(temperature, humidity, smokeValue, motionAlert, alertActive, reason);

    Serial.println("------------------------------------------");
  }

  delay(10);
}
