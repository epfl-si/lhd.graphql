import { Issuer } from 'openid-client';

const tototutu = async () => {
  const googleIssuer = await Issuer.discover('http://localhost:8080/realms/rails/');
  console.log('Discovered issuer %s %O', googleIssuer.issuer, googleIssuer.metadata);
}

tototutu();
