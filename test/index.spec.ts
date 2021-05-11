import * as _ from 'lodash'
import { getDecryptor } from '../src/kms'
import { decrypt, decryptProcessEnv } from '../src'

jest.mock('../src/kms', () => ({
  getDecryptor: jest
    .fn()
    .mockReturnValue(jest.fn().mockResolvedValue('secret')),
}))

const base64 = (value: string) => Buffer.from(value).toString('base64')

describe('Environment utils', () => {
  describe('Decrypt a flat ENV dictionary', () => {
    it('returns process environment variables', async () => {
      await expect(
        decrypt({
          USER: 'alice',
          FOO: 'bar',
        })
      ).resolves.toEqual({
        USER: 'alice',
        FOO: 'bar',
      })
      // Ensure lazy initialization for the decryptor did not happen
      expect(getDecryptor).not.toBeCalled()
    })

    it('returns decrypted variables', async () => {
      await expect(
        decrypt({
          USER: 'alice',
          PASSWORD_ENCRYPTED: base64('encrypted password'),
          API_KEY_ENCRYPTED: base64('encrypted api key'),
        })
      ).resolves.toEqual({
        USER: 'alice',
        PASSWORD: 'secret',
        API_KEY: 'secret',
      })
    })
  })

  describe('Decrypt process.env', () => {
    let envBackup: NodeJS.ProcessEnv

    beforeAll(() => {
      envBackup = { ...process.env }
    })

    afterAll(() => {
      process.env = envBackup
    })

    it('calls decrypt with process.env', async () => {
      const TEST_DECRYPT = 'mocked env variable value'
      process.env = { ...process.env, TEST_DECRYPT }
      await expect(decryptProcessEnv()).resolves.toEqual(
        expect.objectContaining({ TEST_DECRYPT })
      )
    })

    it('skips npm packages added to process.env', async () => {
      // Jest add 'npm_package_*' stuff to process.env
      const npm_package_dependencies__msp_encrypted = '^0.1.1'
      process.env = { ...process.env, npm_package_dependencies__msp_encrypted }
      const env = await decryptProcessEnv()
      // Ensure we do not get any of 'npm_package_*' and do not confuse decryptor
      expect(env).not.toEqual(
        expect.objectContaining({ npm_package_dependencies__msp_encrypted })
      )
      expect(env).not.toEqual(
        expect.objectContaining({
          npm_package_dependencies__msp: expect.any('string'),
        })
      )
      expect(getDecryptor).not.toBeCalled()
    })
  })

  describe('Decrypt nested objects', () => {
    it('returns object as it is if nothing to decrypt', async () => {
      const config = {
        postgres: {
          user: 'alice',
          database: 'mothership',
        },
        sentry: {
          dsn: 'https://abc123@sentry.io/1234567',
        },
      }
      await expect(decrypt(config)).resolves.toEqual(config)
      // Ensure lazy initialization for the decryptor did not happen
      expect(getDecryptor).not.toBeCalled()
    })

    it('returns decrypted variables', async () => {
      await expect(
        decrypt({
          postgres: {
            user: 'alice',
            passwordencrypted: base64('password'),
          },
          mailgun: {
            keyencrypted: base64('api-key'),
          },
        })
      ).resolves.toEqual({
        postgres: {
          user: 'alice',
          password: 'secret',
        },
        mailgun: {
          key: 'secret',
        },
      })
    })

    it('flattens the structure if nested object contains only encrypted key', async () => {
      await expect(
        decrypt({
          postgres: {
            user: 'alice',
            password: {
              encrypted: base64('password'),
            },
          },
        })
      ).resolves.toEqual({
        postgres: {
          user: 'alice',
          password: 'secret',
        },
      })
    })
  })

  describe('Explicit KMS config', () => {
    beforeAll(() => {})

    it('passes config to getDecryptor', async () => {
      const config = {}
      await expect(
        decrypt(
          {
            postgres: {
              user: 'alice',
              passwordencrypted: base64('password'),
            },
            mailgun: {
              keyencrypted: base64('api-key'),
            },
          },
          config
        )
      ).resolves.toEqual({
        postgres: {
          user: 'alice',
          password: 'secret',
        },
        mailgun: {
          key: 'secret',
        },
      })
      expect(getDecryptor).lastCalledWith(config)
    })
  })
})
