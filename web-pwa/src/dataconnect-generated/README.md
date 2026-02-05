# Generated TypeScript README
This README will guide you through the process of using the generated JavaScript SDK package for the connector `example`. It will also provide examples on how to use your generated SDK to call your Data Connect queries and mutations.

**If you're looking for the `React README`, you can find it at [`dataconnect-generated/react/README.md`](./react/README.md)**

***NOTE:** This README is generated alongside the generated SDK. If you make changes to this file, they will be overwritten when the SDK is regenerated.*

# Table of Contents
- [**Overview**](#generated-javascript-readme)
- [**Accessing the connector**](#accessing-the-connector)
  - [*Connecting to the local Emulator*](#connecting-to-the-local-emulator)
- [**Queries**](#queries)
  - [*GetPublicLists*](#getpubliclists)
  - [*GetMoviesByGenre*](#getmoviesbygenre)
- [**Mutations**](#mutations)
  - [*AddMovieToList*](#addmovietolist)
  - [*CreateUserReview*](#createuserreview)

# Accessing the connector
A connector is a collection of Queries and Mutations. One SDK is generated for each connector - this SDK is generated for the connector `example`. You can find more information about connectors in the [Data Connect documentation](https://firebase.google.com/docs/data-connect#how-does).

You can use this generated SDK by importing from the package `@dataconnect/generated` as shown below. Both CommonJS and ESM imports are supported.

You can also follow the instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#set-client).

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
```

## Connecting to the local Emulator
By default, the connector will connect to the production service.

To connect to the emulator, you can use the following code.
You can also follow the emulator instructions from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#instrument-clients).

```typescript
import { connectDataConnectEmulator, getDataConnect } from 'firebase/data-connect';
import { connectorConfig } from '@dataconnect/generated';

const dataConnect = getDataConnect(connectorConfig);
connectDataConnectEmulator(dataConnect, 'localhost', 9399);
```

After it's initialized, you can call your Data Connect [queries](#queries) and [mutations](#mutations) from your generated SDK.

# Queries

There are two ways to execute a Data Connect Query using the generated Web SDK:
- Using a Query Reference function, which returns a `QueryRef`
  - The `QueryRef` can be used as an argument to `executeQuery()`, which will execute the Query and return a `QueryPromise`
- Using an action shortcut function, which returns a `QueryPromise`
  - Calling the action shortcut function will execute the Query and return a `QueryPromise`

The following is true for both the action shortcut function and the `QueryRef` function:
- The `QueryPromise` returned will resolve to the result of the Query once it has finished executing
- If the Query accepts arguments, both the action shortcut function and the `QueryRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Query
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each query. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-queries).

## GetPublicLists
You can execute the `GetPublicLists` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getPublicLists(): QueryPromise<GetPublicListsData, undefined>;

interface GetPublicListsRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetPublicListsData, undefined>;
}
export const getPublicListsRef: GetPublicListsRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getPublicLists(dc: DataConnect): QueryPromise<GetPublicListsData, undefined>;

interface GetPublicListsRef {
  ...
  (dc: DataConnect): QueryRef<GetPublicListsData, undefined>;
}
export const getPublicListsRef: GetPublicListsRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getPublicListsRef:
```typescript
const name = getPublicListsRef.operationName;
console.log(name);
```

### Variables
The `GetPublicLists` query has no variables.
### Return Type
Recall that executing the `GetPublicLists` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetPublicListsData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetPublicListsData {
  lists: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & List_Key)[];
}
```
### Using `GetPublicLists`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getPublicLists } from '@dataconnect/generated';


// Call the `getPublicLists()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getPublicLists();

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getPublicLists(dataConnect);

console.log(data.lists);

// Or, you can use the `Promise` API.
getPublicLists().then((response) => {
  const data = response.data;
  console.log(data.lists);
});
```

### Using `GetPublicLists`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getPublicListsRef } from '@dataconnect/generated';


// Call the `getPublicListsRef()` function to get a reference to the query.
const ref = getPublicListsRef();

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getPublicListsRef(dataConnect);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.lists);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.lists);
});
```

## GetMoviesByGenre
You can execute the `GetMoviesByGenre` query using the following action shortcut function, or by calling `executeQuery()` after calling the following `QueryRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
getMoviesByGenre(vars: GetMoviesByGenreVariables): QueryPromise<GetMoviesByGenreData, GetMoviesByGenreVariables>;

interface GetMoviesByGenreRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMoviesByGenreVariables): QueryRef<GetMoviesByGenreData, GetMoviesByGenreVariables>;
}
export const getMoviesByGenreRef: GetMoviesByGenreRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `QueryRef` function.
```typescript
getMoviesByGenre(dc: DataConnect, vars: GetMoviesByGenreVariables): QueryPromise<GetMoviesByGenreData, GetMoviesByGenreVariables>;

interface GetMoviesByGenreRef {
  ...
  (dc: DataConnect, vars: GetMoviesByGenreVariables): QueryRef<GetMoviesByGenreData, GetMoviesByGenreVariables>;
}
export const getMoviesByGenreRef: GetMoviesByGenreRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the getMoviesByGenreRef:
```typescript
const name = getMoviesByGenreRef.operationName;
console.log(name);
```

### Variables
The `GetMoviesByGenre` query requires an argument of type `GetMoviesByGenreVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface GetMoviesByGenreVariables {
  genre: string;
}
```
### Return Type
Recall that executing the `GetMoviesByGenre` query returns a `QueryPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `GetMoviesByGenreData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface GetMoviesByGenreData {
  movies: ({
    id: UUIDString;
    title: string;
    summary?: string | null;
    year: number;
    runtime?: number | null;
  } & Movie_Key)[];
}
```
### Using `GetMoviesByGenre`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, getMoviesByGenre, GetMoviesByGenreVariables } from '@dataconnect/generated';

// The `GetMoviesByGenre` query requires an argument of type `GetMoviesByGenreVariables`:
const getMoviesByGenreVars: GetMoviesByGenreVariables = {
  genre: ..., 
};

// Call the `getMoviesByGenre()` function to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await getMoviesByGenre(getMoviesByGenreVars);
// Variables can be defined inline as well.
const { data } = await getMoviesByGenre({ genre: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await getMoviesByGenre(dataConnect, getMoviesByGenreVars);

console.log(data.movies);

// Or, you can use the `Promise` API.
getMoviesByGenre(getMoviesByGenreVars).then((response) => {
  const data = response.data;
  console.log(data.movies);
});
```

### Using `GetMoviesByGenre`'s `QueryRef` function

```typescript
import { getDataConnect, executeQuery } from 'firebase/data-connect';
import { connectorConfig, getMoviesByGenreRef, GetMoviesByGenreVariables } from '@dataconnect/generated';

// The `GetMoviesByGenre` query requires an argument of type `GetMoviesByGenreVariables`:
const getMoviesByGenreVars: GetMoviesByGenreVariables = {
  genre: ..., 
};

// Call the `getMoviesByGenreRef()` function to get a reference to the query.
const ref = getMoviesByGenreRef(getMoviesByGenreVars);
// Variables can be defined inline as well.
const ref = getMoviesByGenreRef({ genre: ..., });

// You can also pass in a `DataConnect` instance to the `QueryRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = getMoviesByGenreRef(dataConnect, getMoviesByGenreVars);

// Call `executeQuery()` on the reference to execute the query.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeQuery(ref);

console.log(data.movies);

// Or, you can use the `Promise` API.
executeQuery(ref).then((response) => {
  const data = response.data;
  console.log(data.movies);
});
```

# Mutations

There are two ways to execute a Data Connect Mutation using the generated Web SDK:
- Using a Mutation Reference function, which returns a `MutationRef`
  - The `MutationRef` can be used as an argument to `executeMutation()`, which will execute the Mutation and return a `MutationPromise`
- Using an action shortcut function, which returns a `MutationPromise`
  - Calling the action shortcut function will execute the Mutation and return a `MutationPromise`

The following is true for both the action shortcut function and the `MutationRef` function:
- The `MutationPromise` returned will resolve to the result of the Mutation once it has finished executing
- If the Mutation accepts arguments, both the action shortcut function and the `MutationRef` function accept a single argument: an object that contains all the required variables (and the optional variables) for the Mutation
- Both functions can be called with or without passing in a `DataConnect` instance as an argument. If no `DataConnect` argument is passed in, then the generated SDK will call `getDataConnect(connectorConfig)` behind the scenes for you.

Below are examples of how to use the `example` connector's generated functions to execute each mutation. You can also follow the examples from the [Data Connect documentation](https://firebase.google.com/docs/data-connect/web-sdk#using-mutations).

## AddMovieToList
You can execute the `AddMovieToList` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
addMovieToList(vars: AddMovieToListVariables): MutationPromise<AddMovieToListData, AddMovieToListVariables>;

interface AddMovieToListRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddMovieToListVariables): MutationRef<AddMovieToListData, AddMovieToListVariables>;
}
export const addMovieToListRef: AddMovieToListRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
addMovieToList(dc: DataConnect, vars: AddMovieToListVariables): MutationPromise<AddMovieToListData, AddMovieToListVariables>;

interface AddMovieToListRef {
  ...
  (dc: DataConnect, vars: AddMovieToListVariables): MutationRef<AddMovieToListData, AddMovieToListVariables>;
}
export const addMovieToListRef: AddMovieToListRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the addMovieToListRef:
```typescript
const name = addMovieToListRef.operationName;
console.log(name);
```

### Variables
The `AddMovieToList` mutation requires an argument of type `AddMovieToListVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface AddMovieToListVariables {
  listId: UUIDString;
  movieId: UUIDString;
  position: number;
  note?: string | null;
}
```
### Return Type
Recall that executing the `AddMovieToList` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `AddMovieToListData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface AddMovieToListData {
  listItem_insert: ListItem_Key;
}
```
### Using `AddMovieToList`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, addMovieToList, AddMovieToListVariables } from '@dataconnect/generated';

// The `AddMovieToList` mutation requires an argument of type `AddMovieToListVariables`:
const addMovieToListVars: AddMovieToListVariables = {
  listId: ..., 
  movieId: ..., 
  position: ..., 
  note: ..., // optional
};

// Call the `addMovieToList()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await addMovieToList(addMovieToListVars);
// Variables can be defined inline as well.
const { data } = await addMovieToList({ listId: ..., movieId: ..., position: ..., note: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await addMovieToList(dataConnect, addMovieToListVars);

console.log(data.listItem_insert);

// Or, you can use the `Promise` API.
addMovieToList(addMovieToListVars).then((response) => {
  const data = response.data;
  console.log(data.listItem_insert);
});
```

### Using `AddMovieToList`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, addMovieToListRef, AddMovieToListVariables } from '@dataconnect/generated';

// The `AddMovieToList` mutation requires an argument of type `AddMovieToListVariables`:
const addMovieToListVars: AddMovieToListVariables = {
  listId: ..., 
  movieId: ..., 
  position: ..., 
  note: ..., // optional
};

// Call the `addMovieToListRef()` function to get a reference to the mutation.
const ref = addMovieToListRef(addMovieToListVars);
// Variables can be defined inline as well.
const ref = addMovieToListRef({ listId: ..., movieId: ..., position: ..., note: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = addMovieToListRef(dataConnect, addMovieToListVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.listItem_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.listItem_insert);
});
```

## CreateUserReview
You can execute the `CreateUserReview` mutation using the following action shortcut function, or by calling `executeMutation()` after calling the following `MutationRef` function, both of which are defined in [dataconnect-generated/index.d.ts](./index.d.ts):
```typescript
createUserReview(vars: CreateUserReviewVariables): MutationPromise<CreateUserReviewData, CreateUserReviewVariables>;

interface CreateUserReviewRef {
  ...
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserReviewVariables): MutationRef<CreateUserReviewData, CreateUserReviewVariables>;
}
export const createUserReviewRef: CreateUserReviewRef;
```
You can also pass in a `DataConnect` instance to the action shortcut function or `MutationRef` function.
```typescript
createUserReview(dc: DataConnect, vars: CreateUserReviewVariables): MutationPromise<CreateUserReviewData, CreateUserReviewVariables>;

interface CreateUserReviewRef {
  ...
  (dc: DataConnect, vars: CreateUserReviewVariables): MutationRef<CreateUserReviewData, CreateUserReviewVariables>;
}
export const createUserReviewRef: CreateUserReviewRef;
```

If you need the name of the operation without creating a ref, you can retrieve the operation name by calling the `operationName` property on the createUserReviewRef:
```typescript
const name = createUserReviewRef.operationName;
console.log(name);
```

### Variables
The `CreateUserReview` mutation requires an argument of type `CreateUserReviewVariables`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:

```typescript
export interface CreateUserReviewVariables {
  movieId: UUIDString;
  watchId: UUIDString;
  rating: number;
  reviewText?: string | null;
  shareLink?: string | null;
  isPublic?: boolean | null;
}
```
### Return Type
Recall that executing the `CreateUserReview` mutation returns a `MutationPromise` that resolves to an object with a `data` property.

The `data` property is an object of type `CreateUserReviewData`, which is defined in [dataconnect-generated/index.d.ts](./index.d.ts). It has the following fields:
```typescript
export interface CreateUserReviewData {
  review_insert: Review_Key;
}
```
### Using `CreateUserReview`'s action shortcut function

```typescript
import { getDataConnect } from 'firebase/data-connect';
import { connectorConfig, createUserReview, CreateUserReviewVariables } from '@dataconnect/generated';

// The `CreateUserReview` mutation requires an argument of type `CreateUserReviewVariables`:
const createUserReviewVars: CreateUserReviewVariables = {
  movieId: ..., 
  watchId: ..., 
  rating: ..., 
  reviewText: ..., // optional
  shareLink: ..., // optional
  isPublic: ..., // optional
};

// Call the `createUserReview()` function to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await createUserReview(createUserReviewVars);
// Variables can be defined inline as well.
const { data } = await createUserReview({ movieId: ..., watchId: ..., rating: ..., reviewText: ..., shareLink: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the action shortcut function.
const dataConnect = getDataConnect(connectorConfig);
const { data } = await createUserReview(dataConnect, createUserReviewVars);

console.log(data.review_insert);

// Or, you can use the `Promise` API.
createUserReview(createUserReviewVars).then((response) => {
  const data = response.data;
  console.log(data.review_insert);
});
```

### Using `CreateUserReview`'s `MutationRef` function

```typescript
import { getDataConnect, executeMutation } from 'firebase/data-connect';
import { connectorConfig, createUserReviewRef, CreateUserReviewVariables } from '@dataconnect/generated';

// The `CreateUserReview` mutation requires an argument of type `CreateUserReviewVariables`:
const createUserReviewVars: CreateUserReviewVariables = {
  movieId: ..., 
  watchId: ..., 
  rating: ..., 
  reviewText: ..., // optional
  shareLink: ..., // optional
  isPublic: ..., // optional
};

// Call the `createUserReviewRef()` function to get a reference to the mutation.
const ref = createUserReviewRef(createUserReviewVars);
// Variables can be defined inline as well.
const ref = createUserReviewRef({ movieId: ..., watchId: ..., rating: ..., reviewText: ..., shareLink: ..., isPublic: ..., });

// You can also pass in a `DataConnect` instance to the `MutationRef` function.
const dataConnect = getDataConnect(connectorConfig);
const ref = createUserReviewRef(dataConnect, createUserReviewVars);

// Call `executeMutation()` on the reference to execute the mutation.
// You can use the `await` keyword to wait for the promise to resolve.
const { data } = await executeMutation(ref);

console.log(data.review_insert);

// Or, you can use the `Promise` API.
executeMutation(ref).then((response) => {
  const data = response.data;
  console.log(data.review_insert);
});
```

