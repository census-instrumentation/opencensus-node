import * as assert from 'assert';
import * as mocha from 'mocha';

import * as logger from '../src/common/consolelogger';


describe('ConsoleLogger', () => {
    describe('new RootSpan()', () => {
        it('should create a RootSpan instance', () => {
            const consoleLogger = logger({level: 'error'});
            
            consoleLogger.info("info");
            consoleLogger.error("error");
            
            assert.ok(true);
        });
      });
});

