import React, { Dispatch, SetStateAction, useEffect, useRef, useState } from 'react'
import { Subscriber } from 'rxjs'
import Dialog from 'src/generic-components/dialog/dialog.component'
import FormField from 'src/generic-components/form-field/form-field.component'
import { TaskItemModel } from 'src/models/task-item.model'
import { STORES } from 'src/services/stores.service'
import { getNewTaskItemModel, TaskItemStore } from 'src/stores/task-items.store'
import { UiStore } from 'src/stores/ui.store'
import { onChangeHandler } from 'src/utils/on-change-handler'
import './task-item-form.dialog.scss'

export interface TaskItemFormDialogOptions {
  task?: TaskItemModel
}

type TaskItemModelState = [TaskItemModel, Dispatch<SetStateAction<TaskItemModel>>]

export default function TaskItemFormDialog({ task }: TaskItemFormDialogOptions): JSX.Element {
  const uiStore: UiStore = STORES.get(UiStore)
  const taskItemStore: TaskItemStore = STORES.get(TaskItemStore)
  const modalRef = useRef<M.Modal>()
  const [taskItem, setTaskItem]: TaskItemModelState = useState<TaskItemModel>(task || getNewTaskItemModel())
  const sub = new Subscriber()

  useEffect(() => {
    initItemStore().then(subscribeToTaskItem)
    return () => {
      sub.unsubscribe()
    }
  }, [])

  async function initItemStore(): Promise<void> {
    if (taskItemStore.isInitialized && taskItem.id !== taskItemStore.value.id) {
      await taskItemStore.hardReset()
      taskItemStore.initialize(taskItem)
    } else if (!taskItemStore.isInitialized) {
      taskItemStore.initialize(taskItem)
    }
  }

  function subscribeToTaskItem(): void {
    sub.add(taskItemStore.get$().subscribe(setTaskItem))
  }

  const taskFormDialogOptions: Partial<M.ModalOptions> = {
    onCloseEnd: () => updateIsTaskFormOpen(false)
  }

  function updateIsTaskFormOpen(isTaskFormOpen: boolean): void {
    uiStore.update({ isTaskFormOpen }, `${TaskItemFormDialog.name}->${isTaskFormOpen ? `open` : `close`}-task-from`)
  }

  return <Dialog modalOptions={taskFormDialogOptions}
    modalClasses={[`task-item-form-dialog`]}
    header={taskItem.id ? `Task ${taskItem.id}` : `New Task`}
    content={<div>
      <FormField>
        <React.Fragment>
          <input type="text" value={taskItem.title} onChange={onChangeHandler(taskItemStore.setTitle)} />
          <label>Title</label>
        </React.Fragment>
      </FormField>
    </div>}
    modalRef={modalRef}></Dialog>
}
