# Getting Started

This page takes you from a clean Ubuntu 22.04 / ROS 2 Humble machine to a running demo.

## Prerequisites

### Host packages

```bash
# Ubuntu 22.04 / ROS 2 Humble
sudo apt install python3-pip python3-venv tmux
pip3 install pika redis requests pymongo psutil
```

### Docker network

All containers attach to one shared network:

```bash
docker network create rmf2_broker_rmf-network
```

### Stop conflicting host services

The stack runs its own brokers, so stop any system-wide ones:

```bash
sudo systemctl stop mosquitto.service 2>/dev/null || true
sudo systemctl stop rabbitmq-server.service 2>/dev/null || true
```

## Get the source

Each module is a separate repository cloned next to `ros_industrial_demo` under
`~/ros_industrial_ws`:

```bash
mkdir -p ~/ros_industrial_ws
cd ~/ros_industrial_ws

# Clone repositories (legacy branch)
git clone -b legacy https://github.com/ros-industrial/rmf_industrial.git ros_industrial_demo
git clone -b legacy https://github.com/ros-industrial/vda5050_core.git vda5050_fiware_repo
git clone -b legacy https://github.com/ros-industrial/res_mapf.git mapf_unified_repo
git clone -b legacy https://github.com/ros-industrial/rmf2_task_orchestrator.git task_orchestrator_repo
git clone -b legacy https://github.com/ros-industrial/rmf2_broker.git rmf2_broker_repo
```

## Build the images

```bash
# VDA5050 FIWARE Bridge
cd ~/ros_industrial_ws/vda5050_fiware_repo
docker build -t vda5050_fiware_repo-vda5050_fiware:latest .

# MAPF Unified (includes map server, solver, executor)
cd ~/ros_industrial_ws/mapf_unified_repo
docker build -t mapf_unified:latest .

# Task Orchestrator
cd ~/ros_industrial_ws/task_orchestrator_repo/
docker build -t rmf2_task_orchestrator:latest .

# IOCS Broker Stack (Scorpio, Redis, RabbitMQ, Postgres)
cd ~/ros_industrial_ws/rmf2_broker_repo
docker  build -f ./Containers/rmf-base.Dockerfile . -t mctdis/rmf-base
docker compose build

```

::: tip
First-time builds are slow: MAPF ~10–15 min, VDA5050 ~5–10 min.
:::

## Launch the environment

The recommended launcher runs each startup step in its **own tmux pane** and gates on a
health check before moving on:

```bash
cd ~/ros_industrial_ws/ros_industrial_demo/launch
./start_environment_tmux.sh

# tear down (if you have trouble starting, run a teardown first)
# ./stop_environment_tmux.sh          # graceful, reverse order, kills the tmux session
# ./stop_environment_tmux.sh --hard   # also force-removes leftover containers and frees the ports below
```

::: warning Port conflicts
The stack publishes the host ports below. If a previous run — or any other process
(your own Postgres, Redis, RabbitMQ, Mosquitto, etc.) — is already holding one of them,
startup will fail. Before starting, make sure they are free.

The launcher gates on four of these; a conflict on any **gate port** halts startup:

| Step              | Service       | Gate port | Other host ports bound                                                                                                                                                                                                                      |
| ----------------- | ------------- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dashboard         | rmf2-launcher | **8083**  | —                                                                                                                                                                                                                                           |
| Broker (IOCS)     | Swagger / API | **8000**  | 1026 (Orion), 9090 (Scorpio), 5432 (Postgres), 5431 (logger DB), 6379 (Redis), 5672 (RabbitMQ), 15672 (RabbitMQ UI), 27016 (Mongo), 8001 (connector), 8002 (event mgr), 8003 (RMF proxy), 8004 (logger), 8084 (monitor), 9999 (nginx proxy) |
| MQTT              | Mosquitto     | —         | 1883–1888                                                                                                                                                                                                                                   |
| MAPF (unified)    | solver        | **8888**  | 7073 (map server), 6333 (AGV state), 1932 (ADG MQTT), 1933 (MRS MQTT)                                                                                                                                                                       |
| Task Orchestrator | HTTP API      | **2727**  | —                                                                                                                                                                                                                                           |
| Devices (VDA5050) | FIWARE bridge | —         | 1928                                                                                                                                                                                                                                        |

You MUST ensure every port below is free before starting — each command should return
nothing. Stop or remove whatever shows up.

```bash
sudo lsof -i :8083 -i :8000 -i :8001 -i :8002 -i :8003 -i :8004 -i :8084 \
          -i :8888 -i :2727 -i :1026 -i :9090 -i :9999 \
          -i :5431 -i :5432 -i :5672 -i :15672 -i :6379 -i :27016 \
          -i :7073 -i :6333 \
          -i :1883 -i :1884 -i :1885 -i :1886 -i :1887 -i :1888 \
          -i :1928 -i :1932 -i :1933
```

:::

What it does, in order (see [Launch scripts](/guide/launch-scripts) for the full table):

## Download & Launch the warehouse simulation

Download and unpack the latest UE5 simulation build:

```bash
cd ~/ros_industrial_ws
curl -OL https://downloads.rmf-industrial.org/UE5Demos/RMF2_SIM_20260611.zip
unzip RMF2_SIM_20260611.zip
mv RMF2_SIM_20260611 ~/ros_industrial_ws/simulation
```

You can launch it standalone to verify it runs (the launcher also starts it as one of
its steps):

```bash
cd ~/ros_industrial_ws/simulation
./Linux/RMF2_SIM.sh
```

The simulation starts in fullscreen mode by default.

- Move: `W A S D`
- Toggle fullscreen: `Alt + Enter`
- Map marker: `M`

::: tip
See [Troubleshooting](/guide/tutorials/simulation#troubleshooting) if the simulation doesn't run as expected. Some environments (e.g. newer Ubuntu releases or mixed integrated/discrete GPU machines) may need extra steps.
:::

## Send a Demo Task to the Task Orchestrator

Publish a parallel workflow to the Task Orchestrator. This workflow forks into multiple robot tasks and joins when all robots complete their work.

```bash
cd ~/ros_industrial_ws/ros_industrial_demo/test_scripts/taskorchestrator
python3 send_workflow.py
```

![Demo_TaskOrchestrator](/demo/to.gif)
