# Isokinetic muscle strength

This application is an isokinetic muscle strength assessment analysis tool that allows users to load measurement data, visualize it, and perform detailed analyses of muscle performance. In addition, the application includes a feature that allows users to generate and export all analysis reports as PDFs with a single click, making it easy to document, archive, and share results with professionals such as physiotherapists, trainers, or medical staff.

## Running dev environment

Install all packages:

```bash
npm install
```

Open dev environment:

```bash
npm run dev
```

## Deployment

New deployments are automatically made every time the main branch is updated. The deployment happens using GitHub pages and the GitHub workflow script will run the deployment every time changes are detected.

If this repository is closed or changes location you will have to enable GitHub pages from the repository settings. When GitHub pages deployment was successful you will see a green check mark under `deployments` in the sidebar.
<img width="441" height="197" alt="image" src="https://github.com/user-attachments/assets/23f5b207-0436-4091-8e85-f5a1d28621e5" />


## Code structure

All CTM file parsing helper functions are inside CTMUtils.js file. The output parsed file will mostly just follow the same structure the CTM file was already in, but there are a couple of additions.
1. `pointCollections`: This is a simple array that will usually hold a list of numbers. Most point arrays are always single dimensional, but error bands will be two dimensional lists.
    - Point collections will always contain the points and then maxValue and minValues.
2. `splitCollections`: These objects are used to index the `pointCollections`. For example we have one `pointCollection` for torque data, but then the splitCollection, will contain 6 repetitions for this data. Split will always contain `startIndex`, `endIndex` and `splits`. They can also have data for the color or disabled state of the repetitions. The idea is that `pointCollections` will always be just point and all extra metadata will be inside `splitCollection`
3. `color`: None of the repetitions will tell you if the action is `Flex` or `Extension`. This information can be parsed using the `color` attribute. `red` is always an extension and `blue` is always flex.

The files are loaded & parsed via web-workers/threads (./src/workers/). The idea is that all intensive calculations that can be done on other threads are done inside other threads.
1. `filterFilesFromActiveFolders`:  Loads files with type .ctm/.cxp from selected folders, reads some metadata for usage in fileBrowser. Loading & converting files done in batches to reduce load. <br/>Currently loads around 1000 files/s. Larger batch sizes may load more files/s, but with greatly increased resource cost.
2. `parseSelectedFiles`: Handles converting files to objects for use in graph displays, barcharts & .PDF generation

All used global signals are exported from a single main ./src/signals.js file to increase readability of the code.
Code testing (WIP) implemented via assert statements, executed when code is run. The idea is that if you ever trigger an assertion you should know that something is wrong. `GenericSVGChar.js` also uses asserts to aggressively crash components that are initialized with wrong or missing props.

## Future improvement ideas

- Deployment in Metropolia cloud
- Language selector
- Gravity filter
- Bar charts to pdf
- Increase testing coverage

## More

User manual is in finnish and it is located in the project root as [userManual.md](userManual.md)


