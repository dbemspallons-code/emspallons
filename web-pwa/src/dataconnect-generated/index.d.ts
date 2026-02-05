import { ConnectorConfig, DataConnect, QueryRef, QueryPromise, MutationRef, MutationPromise } from 'firebase/data-connect';

export const connectorConfig: ConnectorConfig;

export type TimestampString = string;
export type UUIDString = string;
export type Int64String = string;
export type DateString = string;




export interface AddMovieToListData {
  listItem_insert: ListItem_Key;
}

export interface AddMovieToListVariables {
  listId: UUIDString;
  movieId: UUIDString;
  position: number;
  note?: string | null;
}

export interface CreateUserReviewData {
  review_insert: Review_Key;
}

export interface CreateUserReviewVariables {
  movieId: UUIDString;
  watchId: UUIDString;
  rating: number;
  reviewText?: string | null;
  shareLink?: string | null;
  isPublic?: boolean | null;
}

export interface GetMoviesByGenreData {
  movies: ({
    id: UUIDString;
    title: string;
    summary?: string | null;
    year: number;
    runtime?: number | null;
  } & Movie_Key)[];
}

export interface GetMoviesByGenreVariables {
  genre: string;
}

export interface GetPublicListsData {
  lists: ({
    id: UUIDString;
    name: string;
    description?: string | null;
    createdAt: TimestampString;
    updatedAt: TimestampString;
  } & List_Key)[];
}

export interface ListItem_Key {
  listId: UUIDString;
  position: number;
  __typename?: 'ListItem_Key';
}

export interface List_Key {
  id: UUIDString;
  __typename?: 'List_Key';
}

export interface Movie_Key {
  id: UUIDString;
  __typename?: 'Movie_Key';
}

export interface Review_Key {
  id: UUIDString;
  __typename?: 'Review_Key';
}

export interface User_Key {
  id: UUIDString;
  __typename?: 'User_Key';
}

export interface Watch_Key {
  id: UUIDString;
  __typename?: 'Watch_Key';
}

interface AddMovieToListRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: AddMovieToListVariables): MutationRef<AddMovieToListData, AddMovieToListVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: AddMovieToListVariables): MutationRef<AddMovieToListData, AddMovieToListVariables>;
  operationName: string;
}
export const addMovieToListRef: AddMovieToListRef;

export function addMovieToList(vars: AddMovieToListVariables): MutationPromise<AddMovieToListData, AddMovieToListVariables>;
export function addMovieToList(dc: DataConnect, vars: AddMovieToListVariables): MutationPromise<AddMovieToListData, AddMovieToListVariables>;

interface GetPublicListsRef {
  /* Allow users to create refs without passing in DataConnect */
  (): QueryRef<GetPublicListsData, undefined>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect): QueryRef<GetPublicListsData, undefined>;
  operationName: string;
}
export const getPublicListsRef: GetPublicListsRef;

export function getPublicLists(): QueryPromise<GetPublicListsData, undefined>;
export function getPublicLists(dc: DataConnect): QueryPromise<GetPublicListsData, undefined>;

interface CreateUserReviewRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: CreateUserReviewVariables): MutationRef<CreateUserReviewData, CreateUserReviewVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: CreateUserReviewVariables): MutationRef<CreateUserReviewData, CreateUserReviewVariables>;
  operationName: string;
}
export const createUserReviewRef: CreateUserReviewRef;

export function createUserReview(vars: CreateUserReviewVariables): MutationPromise<CreateUserReviewData, CreateUserReviewVariables>;
export function createUserReview(dc: DataConnect, vars: CreateUserReviewVariables): MutationPromise<CreateUserReviewData, CreateUserReviewVariables>;

interface GetMoviesByGenreRef {
  /* Allow users to create refs without passing in DataConnect */
  (vars: GetMoviesByGenreVariables): QueryRef<GetMoviesByGenreData, GetMoviesByGenreVariables>;
  /* Allow users to pass in custom DataConnect instances */
  (dc: DataConnect, vars: GetMoviesByGenreVariables): QueryRef<GetMoviesByGenreData, GetMoviesByGenreVariables>;
  operationName: string;
}
export const getMoviesByGenreRef: GetMoviesByGenreRef;

export function getMoviesByGenre(vars: GetMoviesByGenreVariables): QueryPromise<GetMoviesByGenreData, GetMoviesByGenreVariables>;
export function getMoviesByGenre(dc: DataConnect, vars: GetMoviesByGenreVariables): QueryPromise<GetMoviesByGenreData, GetMoviesByGenreVariables>;

