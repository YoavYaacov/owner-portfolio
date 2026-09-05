import { describe, expect, it } from 'vitest'
import { validatePassword, validatePasswordsMatch, validateUsername } from '../lib/validation'

describe('validateUsername', () => {
  it('rejects empty input', () => {
    expect(validateUsername('').valid).toBe(false)
    expect(validateUsername('   ').valid).toBe(false)
  })

  it('rejects too short or too long usernames', () => {
    expect(validateUsername('ab').valid).toBe(false)
    expect(validateUsername('a'.repeat(33)).valid).toBe(false)
  })

  it('rejects uppercase letters', () => {
    expect(validateUsername('YoavY').valid).toBe(false)
  })

  it('rejects disallowed characters', () => {
    expect(validateUsername('yoav yaacov').valid).toBe(false)
    expect(validateUsername('yoav@yaacov').valid).toBe(false)
  })

  it('accepts a valid username', () => {
    expect(validateUsername('yoav.yaacov-1').valid).toBe(true)
  })
})

describe('validatePassword', () => {
  it('rejects empty and short passwords', () => {
    expect(validatePassword('').valid).toBe(false)
    expect(validatePassword('short1').valid).toBe(false)
  })

  it('accepts an 8+ character password', () => {
    expect(validatePassword('longenough').valid).toBe(true)
  })
})

describe('validatePasswordsMatch', () => {
  it('flags mismatched confirmation', () => {
    expect(validatePasswordsMatch('abcdefgh', 'abcdefgi').valid).toBe(false)
  })

  it('passes when both match', () => {
    expect(validatePasswordsMatch('abcdefgh', 'abcdefgh').valid).toBe(true)
  })
})
