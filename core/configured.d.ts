import type { Api as CoreApi } from './index.js';
import type { Api as EngineApi } from './types.js';
/** A core configured with the default signal integration. */
export interface Api extends CoreApi {
    engine: EngineApi;
    sub: NonNullable<CoreApi['sub']>;
}
export declare const api: Api;
