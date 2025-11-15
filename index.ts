import {makeServer} from './server';
import * as dns from 'dns';
import {configFromDotEnv} from "./libs/config";
// Otherwise localhost is [::1], but unfortunately docker doesn't believe in ipv6
dns.setDefaultResultOrder('ipv4first');

const start = async () => {
	const server = await makeServer(configFromDotEnv());

	server.listen(3001, () => {
		console.log(`🚀  Server ready at localhost:3001`);
	});
};

start();
