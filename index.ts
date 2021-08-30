import { makeServer, configFromDotEnv } from './server'

makeServer(configFromDotEnv()).listen(3001, () => {
  console.log(`🚀  Server ready at localhost:3001`);
})
