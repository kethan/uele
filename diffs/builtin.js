/**
 * Select basic marker replacement (core/lite default): no `api.diff`, no dependency.
 *
 *     import { builtinDiff } from 'uele/diffs/builtin';
 *     builtinDiff();
 */
import { api } from 'uele';

export const builtinDiff = (target = api) => {
	target.diff = undefined;
	return target;
};
