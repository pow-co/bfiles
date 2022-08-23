
import { BFile, read } from '@runonbitcoin/easy-b'

import { badRequest } from 'boom'

import { log } from '../../log'

export async function show(request, h ) {

    try {

        const { txid } = request.params

        log.info('handlers.bfiles.show', { txid })
    
        const bFile: BFile = await read(txid)
        
        log.info('handlers.bfiles.show.result', {
            txid,
            mime: bFile.mime,
            name: bFile.fileName,
            format: bFile.format
        })
    
        return h.response(bFile.buff)
            .header('Content-Disposition', `inline; filename="${bFile.fileName}"`)
            .type(`${bFile.mime}; ${bFile.format}`)
            .code(200)

    } catch(error) {

        log.error('handlers.bfiles.show', error)

        return badRequest(error)

    }

}

interface BfileResult {
    name: string,
    mime: string;
    format: string;
    data: string;
}

export async function showAsJSON(request, h ) {

    try {

        const { txid } = request.params

        log.info('handlers.bfiles.show', { txid })
    
        const bFile: BFile = await read(txid)
    
        const result: BfileResult = {
            mime: bFile.mime,
            name: bFile.fileName,
            format: bFile.format,
            data: bFile.buff.toString('hex')
        }
    
        log.info('handlers.bfiles.show.result', {
            txid,
            mime: bFile.mime,
            name: bFile.fileName,
            format: bFile.format
        })
    
        return h.response(result).code(200)

    } catch(error) {

        log.error('handlers.bfiles.show', error)

        return badRequest(error)

    }

}