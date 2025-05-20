import { uploadImage } from '@/functions/upload-image'
import { isRight, unwrapEither } from '@/shared/either'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'

export const uploadImageRoute: FastifyPluginAsyncZod = async server => {
  server.post(
    '/uploads',
    {
      schema: {
        summary: 'Upload de imagens',
        tags: ['uploads'],
        consumes: ['multipart/form-data'],
        response: {
          201: z
            .object({ url: z.string() })
            .describe('File uploaded successfully'),
          400: z.object({ message: z.string() }).describe('File is required'),
        },
      },
    },
    async (request, reply) => {
      const uploadedFile = await request.file({
        limits: {
          fileSize: 1024 * 1024 * 2, // 2MB
        },
      })

      if (!uploadedFile) {
        return reply.status(400).send({
          message: 'File is required',
        })
      }

      const result = await uploadImage({
        fileName: uploadedFile.filename,
        contentType: uploadedFile.mimetype,
        contentStream: uploadedFile.file,
      })

      if (uploadedFile.file.truncated) {
        return reply.status(400).send({
          message: 'File size limit reached',
        })
      }

      if (isRight(result)) {
        return reply.status(201).send({ url: unwrapEither(result).url })
      }

      const error = unwrapEither(result)

      switch (error.constructor.name) {
        case 'InvalidFileFormat':
          return reply.status(400).send({
            message: error.message,
          })
      }
    }
  )
}
