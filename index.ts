import { makeServer, configFromDotEnv } from './server';

const start = async () => {
	const server = await makeServer(configFromDotEnv());

	server.listen(3001, () => {
		console.log(`🚀  Server ready at localhost:3001`);
	});
};

start();
