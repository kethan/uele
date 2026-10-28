import * as main from 'uele';

/** Install once, before creating state or rendering. Omitted categories stay unchanged. */
export const configure = ({ signals, diff, props = [] } = {}, target = main) => {
	signals?.(target.api);
	diff?.(target.api);
	for (const install of props) install(target);
	return target;
};
