from setuptools import setup

setup(name='mock_ccsapi',
      version='0.1',
      description='A light-weight ccsapi server that delegates to a Docker daemon',
      author='Your Name',
      author_email='example@example.com',
      install_requires=['requests',
                        'flask']
     )
