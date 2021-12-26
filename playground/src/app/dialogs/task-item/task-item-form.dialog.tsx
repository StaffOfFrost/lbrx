import React, { Dispatch, SetStateAction, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Subscriber } from 'rxjs'
import Btn from 'src/generic-components/btn/btn'
import Dialog from 'src/generic-components/dialog/dialog.component'
import FormField, { InputTypes } from 'src/generic-components/form-field/form-field.component'
import { TaskItemModel } from 'src/models/task-item.model'
import { STORES } from 'src/services/stores.service'
import { getNewTaskItemModel, TaskItemStore } from 'src/stores/task-item.store'
import { UiStore } from 'src/stores/ui.store'
import { onChangeHandler } from 'src/utils/on-change-handler'
import './task-item-form.dialog.scss'

export interface TaskItemFormDialogOptions {
  task?: TaskItemModel
}

type TaskItemDispatcher = Dispatch<SetStateAction<TaskItemModel>>
type HtmlElementDispatch = [HTMLElement | null, Dispatch<SetStateAction<HTMLElement | null>>]
type TaskItemModelState = [TaskItemModel, TaskItemDispatcher]

async function initItemStore(taskItemStore: TaskItemStore, taskItem: TaskItemModel): Promise<void> {
  if (taskItemStore.isInitialized && taskItem.id !== taskItemStore.value.id) {
    await taskItemStore.hardReset()
    taskItemStore.initialize(taskItem)
  } else if (!taskItemStore.isInitialized) {
    taskItemStore.initialize(taskItem)
  }
}

export default function TaskItemFormDialog({ task }: TaskItemFormDialogOptions): JSX.Element {
  const sub = useMemo(() => new Subscriber(), [])
  const uiStore: UiStore = useMemo(() => STORES.get(UiStore), [])
  const taskItemStore: TaskItemStore = useMemo(() => STORES.get(TaskItemStore), [])
  const taskFormDialogOptions: Partial<M.ModalOptions> = useMemo(() => ({
    onCloseEnd: () => modalCloseCb()
  }), [])

  const modalRef = useRef<M.Modal>()
  const datepickerRef = useRef<M.Datepicker>()
  const timepickerRef = useRef<M.Timepicker>()

  const [taskItem, setTaskItem]: TaskItemModelState = useState<TaskItemModel>(task || getNewTaskItemModel())
  const [datepickerElem, setDatepickerElem]: HtmlElementDispatch = useState<HTMLElement | null>(null)
  const [timepickerElem, setTimepickerElem]: HtmlElementDispatch = useState<HTMLElement | null>(null)

  const subscribeToTaskItem = useCallback(() => sub.add(taskItemStore.get$().subscribe(setTaskItem)), [])
  const componentCleanUp = useCallback(() => { sub.unsubscribe() }, [])
  const modalCloseCb = useCallback(() => uiStore.closeTaskForm(`close-task-form`), [])
  const saveTask = useCallback(() => console.log(taskItem), [])
  const closeForm = useCallback(() => modalRef.current?.close(), [])
  const clearForm = useCallback(() => taskItemStore.set(getNewTaskItemModel()), [])

  useEffect(() => {
    initItemStore(taskItemStore, taskItem).then(subscribeToTaskItem)
    return componentCleanUp
  }, [])

  return <Dialog modalOptions={taskFormDialogOptions}
    modalClasses={[`task-item-form-dialog`]}
    header={taskItem.id ? `Task ${taskItem.id}` : `New Task`}
    headerClasses={[`cyan`, `darken-1`]}
    content={<React.Fragment>
      <div style={{ display: `flex` }}>
        <FormField styles={{ flex: `1` }}>
          <React.Fragment>
            <input type="text"
              id="title"
              value={taskItem.title}
              onChange={onChangeHandler(taskItemStore.setTitle)} />
            <label htmlFor="title">Title</label>
          </React.Fragment>
        </FormField>
        <FormField>
          <p style={{ marginLeft: `1rem` }}>
            <label>
              <input type="checkbox"
                className="filled-in"
                onChange={onChangeHandler(taskItemStore.setIsCompleted)} />
              <span>Completed</span>
            </label>
          </p>
        </FormField>
      </div>
      <div style={{ display: `flex` }}>
        <FormField styles={{ flex: `1` }}
          inputType={InputTypes.date}
          inputElement={datepickerElem}
          datepickerRef={datepickerRef}>
          <React.Fragment>
            <input type="text"
              id="dueDate"
              ref={setDatepickerElem} />
            <label htmlFor="dueDate">Due date</label>
          </React.Fragment>
        </FormField>
        <FormField styles={{ flex: `1` }}
          inputType={InputTypes.time}
          inputElement={timepickerElem}
          timepickerRef={timepickerRef}>
          <React.Fragment>
            <input type="text"
              id="dueTime"
              ref={setTimepickerElem} />
            <label htmlFor="dueTime">Due time</label>
          </React.Fragment>
        </FormField>
      </div>
      <FormField>
        <React.Fragment>
          <textarea id="description"
            className="materialize-textarea"
            value={taskItem.description || ``}
            onChange={onChangeHandler(taskItemStore.setDescription)}></textarea>
          <label htmlFor="description">Description</label>
        </React.Fragment>
      </FormField>
    </React.Fragment>}
    footer={<React.Fragment>
      <Btn action={clearForm}
        classList={[`btn-flat`, `cyan-font`]}>Clear</Btn>
      <Btn action={saveTask}
        classList={[`cyan`, `darken-1`]}>Save</Btn>
      <Btn action={[saveTask, closeForm]}
        classList={[`cyan`, `darken-1`]}>Save & Close</Btn>
    </React.Fragment>}
    footerClasses={[`btns-container-pull-right`]}
    modalRef={modalRef}></Dialog>
}
