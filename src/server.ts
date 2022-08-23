
require('dotenv').config()

import config from './config'

import { Server } from '@hapi/hapi'

import { log } from './log'

import { join } from 'path'

const Joi = require('joi')

const Pack = require('../package');

import { load } from './server/handlers'

import * as H2o2 from '@hapi/h2o2';

import { notFound } from 'boom'

const handlers = load(join(__dirname, './server/handlers'))

export const server = new Server({
  host: config.get('host'),
  port: config.get('port'),
  routes: {
    cors: true,
    validate: {
      options: {
        stripUnknown: true
      }
    }
  }
});

if (config.get('prometheus_enabled')) {

  log.info('server.metrics.prometheus', { path: '/metrics' })

  const { register: prometheus } = require('./metrics')

  server.route({
    method: 'GET',
    path: '/metrics',
    handler: async (req, h) => {
      return h.response(await prometheus.metrics())
    },
    options: {
      description: 'Prometheus Metrics about Node.js Process & Business-Level Metrics',
      tags: ['system']
    }
  })

}

server.route({
  method: 'GET', path: '/api/v0/status',
  handler: handlers.Status.index,
  options: {
    description: 'Simply check to see that the server is online and responding',
    tags: ['api', 'system'],
    response: {
      failAction: 'log',
      schema: Joi.object({
        status: Joi.string().valid('OK', 'ERROR').required(),
        error: Joi.string().optional()
      }).label('ServerStatus')
    }
  }
})

var started = false

export async function start() {

  if (started) return;

  started = true

  if (config.get('swagger_enabled')) {

    const swaggerOptions = {
      info: {
        title: 'API Docs',
        version: Pack.version,
        description: 'Developer API Documentation \n\n *** DEVELOPERS *** \n\n Edit this file under `swaggerOptions` in `src/server.ts` to better describe your service.'
      },
      schemes: ['https'],
      host: 'http://localhost:8000',
      documentationPath: '/',
      grouping: 'tags'
    }

    const Inert = require('@hapi/inert');

    const Vision = require('@hapi/vision');

    const HapiSwagger = require('hapi-swagger');

    await server.register([
        Inert,
        Vision,
        {
          plugin: HapiSwagger,
          options: swaggerOptions
        }
    ]);

    log.info('server.api.documentation.swagger', swaggerOptions)
  }

  await server.register(H2o2);

  server.route({
    method: "GET",
    path: "/favicon.ico",
    handler: () => notFound()
  })

  const provider = config.get('blockchain_provider')

  if (provider === 'run.whatsonchain') {

    server.route({
      method: "GET",
      path: '/{txid}',
      handler: handlers.Bfiles.show
    });

    server.route({
      method: "GET",
      path: '/api/{txid}',
      handler: handlers.Bfiles.showAsJSON
    });
    
  } else if (provider === 'doge.bitcoinfiles.org') {

    server.route({
      method: "*",
      path: '/{txid}',
      handler: {
          proxy: {
                  host: 'doge.bitcoinfiles.org',
                  xforward: true,
                  port: '443',
                  protocol: 'https',
                  passThrough: true
              }
        }
    });

  } else {

    log.error('invalid or missing config variable: blockchain_provider')
    
    process.exit(1)

  }

  await server.start();

  log.info(server.info)

  return server;

}

if (require.main === module) {

  start()

}
