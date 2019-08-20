import * as _ from 'lodash'
import { getDecryptor } from './kms'

type Pair = [string, string]
type Env = _.Dictionary<string>

export async function decrypt(env: Env): Promise<Env> {
  // Find those which marked as encrypted and decrypt them.
  // NOTE original variable will be removed.
  const suffix = '_ENCRYPTED'
  let decryptText: (cipertext: string) => Promise<string>
  const decryptedPairs: ArrayLike<Pair> = await Promise.all(
    _.toPairs(env).map(
      ([key, value]): Promise<Pair> => {
        if (key.endsWith(suffix)) {
          if (!decryptText) {
            decryptText = getDecryptor()
          }
          return new Promise((resolve, reject) => {
            decryptText(value)
              .then((decryptedValue: string) =>
                resolve([
                  key.substring(0, key.length - suffix.length),
                  decryptedValue
                ])
              )
              .catch(reject)
          })
        }
        const original: Pair = [key, value]
        return Promise.resolve(original)
      }
    )
  )

  // Compose an object with decrypted environment
  return _.fromPairs(decryptedPairs)
}

export async function decryptProcessEnv(): Promise<_.Dictionary<String>> {
  return decrypt(process.env)
}
