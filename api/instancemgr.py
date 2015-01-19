import os, requests, json, time, threading
from groupstore import FileGroupStore

DOCKER_REMOTE_HOST=os.environ['DOCKER_REMOTE_HOST'] if 'DOCKER_REMOTE_HOST' in os.environ else 'localhost:4243'

next_id = 1
inc_lock = threading.Lock()

def make_objectid():
    global next_id
    inc_lock.acquire()
    rslt = next_id
    next_id += 1
    inc_lock.release()
    return str(rslt)

def get_docker_instances():
    docker_instances_url = 'http://%s/containers/json?all=1' % DOCKER_REMOTE_HOST
    try:
        r = requests.get(docker_instances_url, headers={'Accept': 'application/json'}, verify=False)
        if r.status_code != 200:
            print '######## FAILED TO GET List of containers at %s status: %s text: %s' %(docker_instances_url, r.status_code, r.text)
            return None
        else:
            return r.json()
    except: #requests.exceptions.ConnectionError: #TODO what to do in this case?
        print '########  Exception while GETing List of containers at %s' % docker_instances_url
        return None

def get_group_instances(group):
    name_prefix = '/' + group["Name"] + '_'
    instances = get_docker_instances()
    response = []
    if instances:
        for instance in instances:
            if "Names" in instance and len(instance["Names"]) and instance["Names"][0].startswith(name_prefix):
                response.append(instance)
    return response
      
def create_instance(group):
    global next_id
    instance_name = group["Name"] + '_' + make_objectid()
    create_url = 'http://%s/containers/create?name=%s' % (DOCKER_REMOTE_HOST, instance_name)
    create_body = {"Image": group["Image"], "Cmd": group["Cmd"], "Env": group["Env"]}
    r = requests.post(create_url, headers={'Content-Type': 'application/json'}, data=json.dumps(create_body))
    if r.status_code != 201:
        print '######## FAILED TO CREATE url: %s status: %s text: %s body: %s' %(create_url, r.status_code, r.text, create_body)
        return
    container = json.loads(r.text)
    #print '######## successfully created docker container %s warnings: %s' % (container['Id'], container['Warnings'])
    container_id = container['Id']
    start_url = ''.join(('http://', DOCKER_REMOTE_HOST, '/containers/', container_id, '/start'))
    r = requests.post(start_url, headers={'Content-type': 'application/json'}, data='{}')
    if r.status_code != 204:
        print '######## FAILED TO START url: %s status: %s text: %s' %(start_url, r.status_code, r.text)
        return
    #print '######## successfully started docker container %s ' % container['Id']

def delete_instances(group, stop_all=True):
    containers = get_group_instances(group)
    for container in containers:
        container_id = container['Id']
        stop_url = ''.join(('http://', DOCKER_REMOTE_HOST, '/containers/', container_id, '/stop'))
        r = requests.post(stop_url, headers={'Content-type': 'application/json'}, data='{}', verify=False)
        if r.status_code != 204:
            print '######## FAILED TO STOP url: %s status: %s text: %s' %(stop_url, r.status_code, r.text)
            pass
        else:
            #print '######## successfully stopped docker container %s ' % container_id
            pass
        delete_url = ''.join(('http://', DOCKER_REMOTE_HOST, '/containers/', container_id))
        r = requests.delete(delete_url, verify=False)
        if r.status_code != 204:
            print '######## FAILED TO DELETE url: %s status: %s text: %s' %(delete_url, r.status_code, r.text)
            pass
        else:
            #print '######## successfully deleted docker container %s ' % container_id
            pass
        if not stop_all: # Just stop one instance
            break

if __name__ == '__main__':
    GROUP_STORE=FileGroupStore(False)
    print "instance_manager started."
    while True:
        for group in GROUP_STORE.list_groups():
            desired_instances = int(group["NumberInstances"]["Desired"]) 
            instances = get_group_instances(group)
            if instances is not None:
                current_instances = len(instances)
                if desired_instances > current_instances:
                    for i in xrange(desired_instances - current_instances):
                        create_instance(group)
                elif desired_instances < current_instances:
                    for i in xrange(current_instances - desired_instances):
                        delete_instances(group, False)
        time.sleep(10)
