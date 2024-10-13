import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { RootState } from "../redux/store"; // Adjust the import path as needed
import {
  fetchTasksStart,
  fetchTasksSuccess,
  fetchTasksFailure,
} from "@/utils/redux/tasks/tasks.slice";
import { PortalSdk } from "../services/PortalSdk";

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds

export const useTasks = () => {
  const dispatch = useDispatch();
  const { tasks, loading, error, lastFetched } = useSelector(
    (state: RootState) => state.tasks
  );

  const fetchTasks = async () => {
    dispatch(fetchTasksStart());
    try {
      const response = await PortalSdk.getData("/api/tasks", null);
      dispatch(fetchTasksSuccess(response.data.tasks));
    } catch (error: any) {
      dispatch(fetchTasksFailure(error.message));
    }
  };

  useEffect(() => {
    const shouldFetch =
      !lastFetched || Date.now() - lastFetched > CACHE_DURATION;
    if (shouldFetch) {
      fetchTasks();
    }
  }, []);

  return { tasks, loading, error, refetch: fetchTasks };
};
