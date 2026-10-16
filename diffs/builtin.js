/**
 * Back to the built-in marker walk (the default): no `api.diff`, no dependency.
 *
 *     import { useBuiltinDiff } from 'uele/diffs/builtin';
 *     useBuiltinDiff();
 */
import { api } from 'uele';

export const useBuiltinDiff = (target = api) => {
	target.diff = undefined;
	target.udom = undefined;
	return target;
};
