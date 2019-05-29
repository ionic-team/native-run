# Contributing

Pull requests are welcome!

To begin, clone the repo, then install dependencies.

```
npm install
```

The source code is written in TypeScript. Spin up the compiler to watch for source changes:

```
npm run watch
```

## Publishing

CI automatically publishes the next version semantically from analyzing commits in `stable`. To maintain a shared history between `master` and `stable`, the branches must be rebased with each other locally.

* When it's time to cut a release from `master`:

    ```
    git checkout stable
    git merge --ff-only master
    git push origin stable
    ```

* Await successful publish in CI. Ionitron will push the updated versions and tags to `stable`.
* Sync `master` with `stable`.

    ```
    git pull origin stable
    git checkout master
    git merge --ff-only stable
    git push origin master
    ```
