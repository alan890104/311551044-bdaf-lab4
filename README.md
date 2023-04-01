# 311551044-bdaf-lab4

[![codecov](https://codecov.io/gh/alan890104/311551044-bdaf-lab4/branch/main/graph/badge.svg)](https://codecov.io/gh/alan890104/311551044-bdaf-lab4)

## Gas Report

- methods
    ![gas methods](image/gas_methods.png)
- deployments
    ![gas deployments](image/gas_deployments.png)

## Install dependencies

```shell
npm install
```

## Compile

```shell
npx hardhat compile
```

## Test with gas report

```shell
REPORT_GAS=true npx hardhat test
```

## Test with coverage report

```shell
npx hardhat coverage
```

## Deploy

```shell
npx hardhat node
npx hardhat run scripts/deploy.ts
```
