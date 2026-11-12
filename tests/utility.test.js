'use strict';
const test=require('node:test');
const assert=require('node:assert/strict');
const utility=require('../src/utility');
test('duration parser supports seconds, minutes, hours and days',()=>{
 assert.equal(utility.parseDuration('10s'),10000);
 assert.equal(utility.parseDuration('15m'),900000);
 assert.equal(utility.parseDuration('2h'),7200000);
 assert.equal(utility.parseDuration('1d'),86400000);
});
test('duration parser rejects malformed and excessive durations',()=>{
 assert.equal(utility.parseDuration('tomorrow'),null);
 assert.equal(utility.parseDuration('0m'),null);
 assert.equal(utility.parseDuration('25d'),null);
});
test('calculator accepts arithmetic and rejects non-arithmetic input',()=>{
 assert.equal(utility.calculator('(12+8)*3'),'60');
 assert.throws(()=>utility.calculator('process.exit()'));
});
