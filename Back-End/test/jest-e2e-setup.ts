import * as http from 'http';
import * as https from 'https';

type AgenteComKeepAlive = http.Agent & { keepAlive: boolean };

(http.globalAgent as AgenteComKeepAlive).keepAlive = false;
(https.globalAgent as unknown as AgenteComKeepAlive).keepAlive = false;
