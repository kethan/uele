const f = tag => new Proxy({}, { get: (_, attrs) => (...children) => tag(attrs, ...children) });

const lazy =
    (file, fallback = "") =>
        (props) =>
            file()
                .then((f) => f.default(props))
                .catch(() => fallback)


export { f, lazy };
