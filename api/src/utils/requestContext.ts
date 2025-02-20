import { createNamespace, getNamespace } from 'cls-hooked';

export const session = getNamespace('request') || createNamespace('request');
