import {debug} from '../../internal/util'
import {StackdriverOptions} from './options'
import {Exporter} from '../exporter'
import {google} from 'googleapis'
import {JWT} from 'google-auth-library';
import { Trace } from '../../trace/model/trace';
const cloudTrace = google.cloudtrace('v1')
var uuidv4 = require('uuid/v4');

export class Stackdriver implements Exporter {
    projectId: string;
        
    constructor(options: StackdriverOptions) {
        this.projectId = options.projectId;
    }
    
    public emit(trace: Trace) {
        // Builds span data
        let spanList = []
        trace.traceSpans.forEach(span => {
            spanList.push({ 
                "name": span.name,
                "kind": "SPAN_KIND_UNSPECIFIED",
                "spanId": span.id,
                "startTime": span.startTime,
                "endTime": span.endTime
            });
        });

        // Builds root span data
        spanList.push({ 
            "name": trace.name,
            "kind": "SPAN_KIND_UNSPECIFIED",
            "spanId": trace.id,
            "startTime": trace.startTime,
            "endTime": trace.endTime
        });

        // Builds trace data
        let resource = {
            "traces": [
                {
                  "projectId": this.projectId,
                  "traceId": trace.traceId,
                  "spans": spanList
                }
            ]
        }
        this.authorize(this.sendTrace, resource);
    }

    private sendTrace(projectId, authClient, resource) {
        let request = {
            projectId: projectId,
            resource: resource,
            auth: authClient
        }
        cloudTrace.projects.patchTraces(request, function(err) {
            if (err) {
                debug(err);
                return;
            } else {
                //debug('\nSENT TRACE:\n', JSON.stringify(request.resource));
                debug('\nSENT TRACE:\n', request.resource);
            }
        })
    }

    private authorize(callback, resource) {
        google.auth.getApplicationDefault(function(err, authClient: JWT, projectId) {
            if (err) {
                console.error('authentication failed: ', err);
                return;
            }
            if (authClient.createScopedRequired && authClient.createScopedRequired()) {
                var scopes = ['https://www.googleapis.com/auth/cloud-platform'];
                authClient = authClient.createScoped(scopes);
            }
            callback(projectId, authClient, resource);
        });
    }
}