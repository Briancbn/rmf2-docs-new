# Demos

Four hands-on demos, one per module.

Every command lives under
`~/ros_industrial_ws/ros_industrial_demo/test_scripts`.

## 1. Send a task to the Task Orchestrator

Publish a workflow diagram (wrapped in a `Schedule`) over AMQP — it fans the work out
across robots.

```bash
cd ~/ros_industrial_ws/ros_industrial_demo/test_scripts/taskorchestrator
python3 send_workflow.py
```

![Task Orchestrator coordinating multi-robot execution in the warehouse simulation](/demo/task-orchestrator-overview.gif)

→ More info: [Task Orchestrator](/modules/task-orchestrator/) · [Create a workflow](/guide/create-workflow)

## 2. Send a MAPF request to MAPF

```bash
cd ~/ros_industrial_ws/ros_industrial_demo/test_scripts/mapf
./loop_tasks.sh 24 1
```

![Demo_Mapf](/demo/mapf-step-01.gif)

→ More info: [MAPF](/modules/mapf)

## 3. Send a VDA5050 order to the VDA5050 master

```bash
cd ~/ros_industrial_ws/ros_industrial_demo/test_scripts/vda5050
./send_command.py 10 P619 P585 P551 P517 P483 P484 P518 P552 P586 P620
```

![Demo_Vda5050](/demo/vda5050-step-01.gif)

→ More info: [VDA5050](/modules/vda5050)

## 4. Control a simulation

Drive the UE5 sim by hand over MQTT — move AGVs and trigger device actions.

```bash
cd ~/ros_industrial_ws/ros_industrial_demo/test_scripts/simulation
./demo_single_agv.py                     # full pick -> manipulate -> conveyor cycle
```

![Simulation cycle](/demo/simulation-step-02.gif)

→ More info: [Simulation](/modules/simulation)

## Tear down

```bash
cd ~/ros_industrial_ws/ros_industrial_demo/launch
./stop_environment_tmux.sh        # or --hard to force-remove leftovers
```
