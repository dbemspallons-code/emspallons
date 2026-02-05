import { AddMovieToListData, AddMovieToListVariables, GetPublicListsData, CreateUserReviewData, CreateUserReviewVariables, GetMoviesByGenreData, GetMoviesByGenreVariables } from '../';
import { UseDataConnectQueryResult, useDataConnectQueryOptions, UseDataConnectMutationResult, useDataConnectMutationOptions} from '@tanstack-query-firebase/react/data-connect';
import { UseQueryResult, UseMutationResult} from '@tanstack/react-query';
import { DataConnect } from 'firebase/data-connect';
import { FirebaseError } from 'firebase/app';


export function useAddMovieToList(options?: useDataConnectMutationOptions<AddMovieToListData, FirebaseError, AddMovieToListVariables>): UseDataConnectMutationResult<AddMovieToListData, AddMovieToListVariables>;
export function useAddMovieToList(dc: DataConnect, options?: useDataConnectMutationOptions<AddMovieToListData, FirebaseError, AddMovieToListVariables>): UseDataConnectMutationResult<AddMovieToListData, AddMovieToListVariables>;

export function useGetPublicLists(options?: useDataConnectQueryOptions<GetPublicListsData>): UseDataConnectQueryResult<GetPublicListsData, undefined>;
export function useGetPublicLists(dc: DataConnect, options?: useDataConnectQueryOptions<GetPublicListsData>): UseDataConnectQueryResult<GetPublicListsData, undefined>;

export function useCreateUserReview(options?: useDataConnectMutationOptions<CreateUserReviewData, FirebaseError, CreateUserReviewVariables>): UseDataConnectMutationResult<CreateUserReviewData, CreateUserReviewVariables>;
export function useCreateUserReview(dc: DataConnect, options?: useDataConnectMutationOptions<CreateUserReviewData, FirebaseError, CreateUserReviewVariables>): UseDataConnectMutationResult<CreateUserReviewData, CreateUserReviewVariables>;

export function useGetMoviesByGenre(vars: GetMoviesByGenreVariables, options?: useDataConnectQueryOptions<GetMoviesByGenreData>): UseDataConnectQueryResult<GetMoviesByGenreData, GetMoviesByGenreVariables>;
export function useGetMoviesByGenre(dc: DataConnect, vars: GetMoviesByGenreVariables, options?: useDataConnectQueryOptions<GetMoviesByGenreData>): UseDataConnectQueryResult<GetMoviesByGenreData, GetMoviesByGenreVariables>;
