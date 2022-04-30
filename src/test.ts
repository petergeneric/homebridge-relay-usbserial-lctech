import {RelayClient} from './relay';

console.log("Creating Relay Client");
const client = new RelayClient(null, '/dev/ttyUSB0', 2);

client.onNewReading.subscribe(reading => {console.log(reading)});
console.log("Client created; calling start")
client.start();
console.log("Start returned");


console.log("Instructing client to switch relay 2 On");
client.set(2, false);

console.log("Done")
