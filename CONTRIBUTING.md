# Contributing

Pull requests are welcome!

To begin, clone the repo and install dependencies.

```
npm install
```

The source code is written in TypeScript. Spin up the compiler to watch for source changes:

```
npm run watch
```

## Publishing

CI automatically publishes the next version semantically from analyzing commits in `stable`. To maintain a shared history between `develop` and `stable`, the branches must be rebased with each other locally.

* When it's time to cut a release from `develop`:

    ```
    git checkout stable
    git merge --ff-only develop
    git push origin stable
    ```

* Await successful publish in CI. Ionitron will push the updated versions and tags to `stable`.
* Sync `develop` with `stable`.

    ```
    git pull origin stable
    git checkout develop
    git merge --ff-only stable
    git push origin develop
    ```
