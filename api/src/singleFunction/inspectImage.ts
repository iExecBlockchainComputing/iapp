// import util from 'node:util';
import Docker from 'dockerode';

const docker = new Docker();

export function inspectImage(image: string) {
  const img = docker.getImage(image);
  return img.inspect();
}
