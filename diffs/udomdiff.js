/**
 * `udomdiff` - takes `(parent, a, b, get, before)`; uele supplies the get
 * callback through `api.udom` and passes the end marker as `before`.
 *
 *     import { udomdiff } from 'uele/diffs/udomdiff';
 *     udomdiff();
 */
import { api } from 'uele';
import engine from 'udomdiff';

export const udomdiff = (target = api) => {
	target.diff = engine;
	target.udom = (node) => node;
	return target;
};
