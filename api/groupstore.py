# A simple file system based group store.
#
import os, binascii, shutil, json

DEFAULT_STORE_DIR = '.groups'
STORE_FILE_SUFFIX = '.json'

class FileGroupStore():
    def __init__(self, store_dir=None):
        if not store_dir:
            path = os.path.abspath(__file__)
            dir_path = os.path.dirname(path)
            store_dir = dir_path + '/' + DEFAULT_STORE_DIR
        if os.path.exists(store_dir):
            #TODO: check if there are corresponding containers and if so, don't delete the groups
            shutil.rmtree(store_dir)
        self.store_dir = store_dir
        
    def put_group(self, group):
        if 'Id' in group:
            group_id = group['Id']
        else:
            group_id = binascii.hexlify(os.urandom(8))
            group['Id'] = group_id
        file_path = self.group_id_to_file(group_id)
        directory = os.path.dirname(file_path)
        if not os.path.exists(directory): # TODO: I think this isn't working properly????
            os.makedirs(directory)
        with open(file_path, 'w') as group_file:
            json.dump(group, group_file)
        return group_id
        
    def get_group(self, group_id):
        file_path = self.group_id_to_file(group_id)
        try:
            with open(file_path, 'r') as group_file:
                group = json.load(group_file)
                return group 
        except IOError:
            return None # Group not found
    
    def delete_group(self, group_id):
        file_path = self.group_id_to_file(group_id)
        if file_path is not None:
            os.unlink(file_path)
            
    def list_groups(self):
        group_list = []
        if os.path.exists(self.store_dir):
            for f in os.listdir(self.store_dir):
                group_id = f[:len(f)-len(STORE_FILE_SUFFIX)]
                group_list.append(self.get_group(group_id))
        return group_list
        
    def group_id_to_file(self, group_id):
        return self.store_dir + '/' + group_id + STORE_FILE_SUFFIX

if __name__ == "__main__":
    testgroup1 = json.loads(
        '''
        {
          "Name": "MyGroup1",
          "Memory":0,
          "CpuShares": 512,
          "Env":null,
          "Cmd":[
            "date"
          ],
          "Image":"ubuntu",
          "WorkingDir":"",
          "RestartPolicy": { "Name": "always", "HealthCheckType" : "HttpHealthCheck", "HealthCheckUrl":"/ping" },
          "NumberInstances": {"Desired": 2, "Min": 1, "Max": 4},
          "AutoScalingPolicy" : {}
        }
        ''')
    testgroup2 = json.loads(
        '''
        {
          "Name": "MyGroup2",
          "Memory":0,
          "CpuShares": 512,
          "Env":null,
          "Cmd":[
            "date"
          ],
          "Image":"centos",
          "WorkingDir":"",
          "RestartPolicy": { "Name": "always", "HealthCheckType" : "HttpHealthCheck", "HealthCheckUrl":"/ping" },
          "NumberInstances": {"Desired": 2, "Min": 1, "Max": 4},
          "AutoScalingPolicy" : {}
        }
        ''')
    store = FileGroupStore()
    store.put_group(testgroup1)
    store.put_group(testgroup2)
    print(json.dumps(store.list_groups()))
