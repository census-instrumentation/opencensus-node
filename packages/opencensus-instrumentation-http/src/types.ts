import {ClientRequest, IncomingMessage} from 'http';

export type IgnoreMatcher<T> =
    string|RegExp|((url: string, request: T) => boolean);

export type HttpPluginConfig = {
  ignoreIncomingPaths?: Array<IgnoreMatcher<IncomingMessage>>;
  ignoreOutgoingUrls?: Array<IgnoreMatcher<ClientRequest>>;
};
