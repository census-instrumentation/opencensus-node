import * as assert from 'assert';
import * as mocha from 'mocha';

import {ConsoleLogger} from '../src/common/consolelogger';


describe('ConsoleLogger', () => {
    describe('new RootSpan()', () => {
        it('should create a RootSpan instance', () => {
            const consoleLogger = new ConsoleLogger({level: 'error'});
            
            consoleLogger.info("info");
            consoleLogger.error("error");
            
            assert.ok(true);
        });
      });
});

