/**
 * `udomdiff` - takes `(parent, a, b, get, before)`; uele supplies the get
 * callback through `api.udom` and passes the end marker as `before`.
 *
 *     import { useUdomdiff } from 'uele/diffs/udomdiff';
 *     useUdomdiff();
 */
import { api } from 'uele';
import udomdiff from 'udomdiff';

export const useUdomdiff = (target = api) => {
	target.diff = udomdiff;
	target.udom = (node) => node;
	return target;
};
