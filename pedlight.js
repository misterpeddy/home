const { login } = require("tplink-cloud-api");

var linkService = null;
var pedLight = null;

async function init() {
  email = process.env.KASA_EMAIL || fatal("Environment variable KASA_EMAIL not set");
  password = process.env.KASA_PASSWORD || fatal("Environment Variable KASA_PASSWORD not set");
  linkService = await login(email, password);
  deviceList = await linkService.getDeviceList();
  pedLight =  linkService.getHS200('ped-light');
}

exports.powerOn = async function powerOn() {
  if (!pedLight) {
    await init();
  }
  pedLight.powerOn();
}

exports.powerOff = async function powerOff() {
  if (!pedLight) {
    await init();
  }
  pedLight.powerOff();
}

function fatal(message) {
  console.log("Error: " + message);
  process.exit(1);
}

function toggle() {
  pedLight.toggle();
}

init().then(toggle).catch(console.log);
