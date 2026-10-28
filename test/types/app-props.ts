import * as main from 'uele';
import * as lite from 'uele/lite';
import { useProps, AppProps } from 'uele/props';
useProps(); useProps(main); useProps(lite);
const props: AppProps = { show: true, aria: { busy: false }, bindValue: ['hi', (value) => value.toUpperCase()], use: () => () => {} };
main.h('input', props);

import { autoScroll } from 'uele/props';
const selection: AppProps = {
    indeterminate: () => true,
    bindSelect: [['a'], (values: string[]) => values.join(',')],
    use: autoScroll({ threshold: 32 })
};
const single: AppProps = { bindSelect: ['a', (value: string) => value.toUpperCase()] };
main.h('select', selection); main.h('select', single);
