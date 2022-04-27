# CypressDemoProject

## Welcome guys to my Cypress Demo Project! :raising_hand_woman: 
### This project includes:
- API Testing
- Contract API Testing
- GUI testing

### 1. Download/Install NodeJS/NPM:

- Access the link [https://nodejs.org/](https://nodejs.org/), download and install NodeJS version 10 or >10;
- Verify the NodeJS and NPM instalation, open Command Prompt and type:

```javascript
    node -v 
```

```javascript
    npm -v
```


### 2. Download/Install Git/GitBash:

- Access the link [https://git-scm.com/downloads](https://git-scm.com/downloads);


### 3. Clone the repository:

``git clone https://github.com/arianefrancaqa/CypressDemoProject.git`

### 4. Install the dependencies and update the packages:

 - For Cypress to work, it needs to be installed via *npm install cypress --save-dev* in the root folder of the project.

 Install Cypress:
``npm install cypress --save-dev``

### 6. Getting Cypress started
- Visual mode:

(1). 
    ```
        npx cypress open
    ```

(2). 
    In Cypress view click 'Run integration spec' button

- Headless mode:

```javascript
  npm run test
```

### 6. About the project
- It is constructed using App Actions with Custom Commands
- To describe the Custom Commands I'm using a *d.ts file because Custom Commands have typescript support. When adding custom commands to the cy object, you can manually add their types to avoid TypeScript errors.
- To speed up the tests I also used a Post API request to create the Login data, that way the tests are not redundant
- To API Schema validation I used Joi validation module

### Cypress documentation that this project is based:
- https://docs.cypress.io/guides/overview/why-cypress
- https://www.cypress.io/blog/2019/01/03/stop-using-page-objects-and-start-using-app-actions/
- https://dev.to/walmyrlimaesilv/how-to-create-custom-commands-with-cypress-3102


[![Cypress Sample Project](https://img.shields.io/endpoint?url=https://dashboard.cypress.io/badge/simple/xkdu4i&style=flat&logo=cypress)](https://dashboard.cypress.io/projects/xkdu4i/runs)
