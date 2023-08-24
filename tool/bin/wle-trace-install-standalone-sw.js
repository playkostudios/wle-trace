#!/usr/bin/env node
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import cpy from 'cpy';

await cpy(
    resolve(dirname(fileURLToPath(import.meta.url)), '..', 'dist', 'wle-trace-sw.js'),
    resolve(process.cwd(), 'static')
);