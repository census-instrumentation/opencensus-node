import {debug} from '../internal/util'
import {google} from 'googleapis'
import { JWT } from 'google-auth-library';
//import { auth } from 'google-auth-library'
//import { request } from 'http';
const cloudTrace = google.cloudtrace('v1')
var uuidv4 = require('uuid/v4');

export class Stackdriver {
    projectId: string;
        
    // TODO: Pass a stackdriver options objetc instead
    constructor(projectId: string) {
        this.projectId = projectId;
    }
    
    emit() {
        let resource = this.generateResource("cesar-opencensus",
                                "2018-03-21T19:36:49.074Z",
                                "2018-03-21T19:36:49.242Z")
        this.authorize(function(projectId, authClient, resource) {
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
                    debug(JSON.stringify(request.resource));
                }
            })
        }, resource);
    }

    private generateTraceId() {
        let traceId = uuidv4().replace(/-/g, '');
        return traceId;
    }
    
    private generateSpanId() {
        const spanIdMax = Math.pow(10, 17);
        const spanIdMin = Math.pow(10, 16);
        
        const spanId = Math.random() * (spanIdMax - spanIdMin) + spanIdMin;
        return spanId.toString();
    }
    
    private generateSpanName() {
        const spanIdMax = Math.pow(10, 3);
        const spanIdMin = Math.pow(10, 2);
      
        const spanIdNum = Math.random() * (spanIdMax - spanIdMin) + spanIdMin;
        return 'Test' + spanIdNum.toString().substring(0, 2);
    }

    private generateResource(projectId, startTime, endTime) {
        let resource = {
            "traces": [
              {
                "projectId": "cesar-opencensus",
                "traceId": this.generateTraceId(),
                "spans": [
                  {
                    "spanId": this.generateSpanId(),
                    "kind": "RPC_CLIENT",
                    "name": this.generateSpanName(),
                    //"startTime": startTime.toISOString(),
                    //"endTime": endTime.toISOString()
                    "startTime": startTime,
                    "endTime": endTime
                  }
                ]
              }
            ]
        }
        return resource;
    }

    private generateRequest(projectId, authClient, startTime, endTime) {
        let request = {
          projectId: projectId,
          resource: {
            "traces": [
              {
                "projectId": "cesar-opencensus",
                "traceId": this.generateTraceId(),
                "spans": [
                  {
                    "spanId": this.generateSpanId(),
                    "kind": "RPC_CLIENT",
                    "name": this.generateSpanName(),
                    //"startTime": startTime.toISOString(),
                    //"endTime": endTime.toISOString()
                    "startTime": startTime,
                    "endTime": endTime
                  }
                ]
              }
            ]
          },
          auth: authClient
        }
        return request;
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