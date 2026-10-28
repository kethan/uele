import { read } from 'uele/reactive';
import type { Cell } from 'uele/reactive';
import { useTheme, createTheme, cssVars, variants } from 'uele/themes';
import type { UeleTheme } from 'uele/themes';
import { useRouter } from 'uele/router';
import type { RouterState } from 'uele/router';
import { Drawer, OTPInput, Separator } from 'uele/ui';

const theme = useTheme({ accent: 'blue' });
const native: Cell<UeleTheme> = theme.theme;
const name: string = read(theme.theme).name;
theme.setTheme((previous) => ({ ...previous, name: previous.name.toUpperCase() }));
theme.setTheme('dark');
theme.setTheme({ accent: 'red' });
// @ts-expect-error cell values are UeleTheme, not any
const invalid: number = read(theme.theme);
// @ts-expect-error updater input has a typed name
theme.setTheme((previous) => previous.name.toFixed());
// @ts-expect-error invalid theme input
theme.setTheme(123);
// @ts-expect-error pure state has no artificial resource disposer
theme.dispose();

const router: RouterState = useRouter({ fetch: () => 'sync view' });
const resolved: Promise<void> = router.navigate('/');
router.props.onclick(new Event('click'));
router.dispose();
// @ts-expect-error result is a named object, not a tuple
const [view] = useRouter({ fetch: async () => null });
// @ts-expect-error props are an object, not a factory
router.props();
// @ts-expect-error theme alias removed
import { defineTheme, themeVars, cva, defineVariants } from 'uele/themes';
// @ts-expect-error UI aliases removed
import { Sheet, OTP, PinInput, Divider, TreeView } from 'uele/ui';
void [native, name, invalid, resolved, view, Drawer, OTPInput, Separator, createTheme, cssVars, variants];
