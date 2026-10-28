/**
 * Back to the built-in marker walk (the default): no `api.diff`, no dependency.
 *
 *     import { builtinDiff } from 'uele/diffs/builtin';
 *     builtinDiff();
 */
import { api } from 'uele';

export const builtinDiff = (target = api) => {
	target.diff = undefined;
	target.udom = undefined;
	return target;
};
