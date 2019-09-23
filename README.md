# vscode-behavior-analysis README

This extension help you better test your project and better understand how it behave during its usage. 

## Features

### Help you instrument your project to analyse it afterward.
<!-- ### Install a postgres database (in a docker container) to index the traces. -->
need gif
### Launch a browser that gather the traces
need gif
### Help you extend your test framework to gather traces during tests
need gif
### Put code lenses and provide code actions on block of codes to show dynamic usage
need gif
### Give a global view on the usage of your project
need gif
### Show the context of execution of parts of your code
need gif
<!-- ### old
Describe specific features of your extension including screenshots of your extension in action. Image paths are relative to this README file.

For example if there is an image sub-folder under your extension project workspace:

\!\[feature X\]\(images/feature-x.png\)

> Tip: Many popular extensions utilize animations. This is an excellent way to show off your extension! We recommend short, focused animations that are easy to follow. -->

## Requirements

It was only tested on Arch linux.
You need `docker-compose`, vscode and npm.
And for now your project need to use _Babeljs_ for the instrumentation, and _Jest_ for unit tests.

## Installation

For now it is not packaged, so it's better to use vscode itself to launch the extension.
```bash
git clone git@github.com:quentinLeDilavrec/vscode-behavior-analysis
code vscode-behavior-analysis
```
Then launch the extension in a new instance of vscode with `F5` then open your project in this new instance.

## First time usage
You can use ()[https://] as an example for the result of the following instructions
### Producing traces
#### Preparations
If you aim at producing traces,
the instrumentation need to be integrated to the compilation pipeline of your project.
- `npm i git+https://git@github.com/quentinLeDilavrec/behavior-code-processing.git`
- Copy the basic extended babel plugin and preset in your project with the vscode command `install basic preset`
- In your _Babeljs_ config set `passPerPreset` to `true`, prepends the path of the preset file to `presets` and `startLine` to `1`.
- Compile your project
### Production of traces in the browser
- In `.vscode/settings.json`, set `behaviorAnalysis.experimentation.startPage` to the url or your application
- Compile your project and launch the server side
- Execute the vscode command `launch instrumented browser`
### Production of traces from unit tests
<!-- - Copy the the jest environment in your project with the vscode command `install jest environment` -->
- In your jest config, set `testEnvironment` to `<rootDir>/node_modules/behavior-code-processing/out/environment.js` and add a new entry to `testEnvironmentOptions` named `output_dir` and containing output path where traces will be saved
- Then you can launch your unit test
<!-- If you have any requirements or dependencies, add a section describing those and how to install and configure them. -->
### Setup the backend in charge of indexing traces
- Execute the vscode command `install data base`
- Reload the window so that the extension can log itself to the database

## Extension Settings
This extension contributes the following settings:

* `behaviorAnalysis.extendedBabelPlugin`: Path to the extended babel plugin in charge of manipulating actual code
* `behaviorAnalysis.interception.interceptDependenciesFunctions`: Intercept functions declared in the current package
* `behaviorAnalysis.interception.automateInstrumentation`: Automatically setup instrumentation
* `behaviorAnalysis.database.identification`: The data necessary to connect to the database containing the traces
* `behaviorAnalysis.database.stackFile`: the file containing the stack for docker compose
* `behaviorAnalysis.database.mappingFile`: Mapping old and new position of instrumented ranges
* `behaviorAnalysis.experimentation.startPage`: The start page of the instrumented browser
* `behaviorAnalysis.experimentation.tracesOutputDirectory`: The output directory where traces will be stored

## Known Issues

Calling out known issues can help limit users opening duplicate issues against your extension.

## Release Notes

Users appreciate release notes as you update your extension.

### 1.0.0

Initial release:

- 
