"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ec2 = require("aws-cdk-lib/aws-ec2");
const eks = require("aws-cdk-lib/aws-eks");
const iam = require("aws-cdk-lib/aws-iam");
const sfn = require("aws-cdk-lib/aws-stepfunctions");
const cdk = require("aws-cdk-lib");
const integ = require("@aws-cdk/integ-tests-alpha");
const aws_stepfunctions_tasks_1 = require("aws-cdk-lib/aws-stepfunctions-tasks");
/**
 * Stack verification steps:
 * Everything in the links below must be setup for the EKS Cluster and Execution Role before running the state machine.
 * @see https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-cluster-access.html
 * @see https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-enable-IAM.html
 * @see https://docs.aws.amazon.com/emr/latest/EMR-on-EKS-DevelopmentGuide/setting-up-trust-policy.html
 *
 * aws stepfunctions start-execution --state-machine-arn <deployed state machine arn> : should return execution arn
 * aws stepfunctions describe-execution --execution-arn <exection-arn generated before> : should return status as SUCCEEDED
 */
const app = new cdk.App();
const stack = new cdk.Stack(app, 'aws-stepfunctions-tasks-emr-containers-all-services-test');
const eksCluster = new eks.Cluster(stack, 'integration-test-eks-cluster', {
    version: eks.KubernetesVersion.V1_21,
    defaultCapacity: 3,
    defaultCapacityInstance: ec2.InstanceType.of(ec2.InstanceClass.M5, ec2.InstanceSize.XLARGE),
});
const jobExecutionRole = new iam.Role(stack, 'JobExecutionRole', {
    assumedBy: new iam.CompositePrincipal(new iam.ServicePrincipal('emr-containers.amazonaws.com'), new iam.ServicePrincipal('states.amazonaws.com')),
});
const createVirtualCluster = new aws_stepfunctions_tasks_1.EmrContainersCreateVirtualCluster(stack, 'Create a virtual Cluster', {
    virtualClusterName: 'Virtual-Cluster-Name',
    eksCluster: aws_stepfunctions_tasks_1.EksClusterInput.fromCluster(eksCluster),
    resultPath: '$.cluster',
});
const startJobRun = new aws_stepfunctions_tasks_1.EmrContainersStartJobRun(stack, 'Start a Job Run', {
    virtualCluster: aws_stepfunctions_tasks_1.VirtualClusterInput.fromTaskInput(sfn.TaskInput.fromJsonPathAt('$.cluster.Id')),
    releaseLabel: aws_stepfunctions_tasks_1.ReleaseLabel.EMR_6_2_0,
    jobName: 'EMR-Containers-Job',
    executionRole: iam.Role.fromRoleArn(stack, 'Job-Execution-Role', jobExecutionRole.roleArn),
    jobDriver: {
        sparkSubmitJobDriver: {
            entryPoint: sfn.TaskInput.fromText('local:///usr/lib/spark/examples/src/main/python/pi.py'),
            entryPointArguments: sfn.TaskInput.fromObject(['2']),
            sparkSubmitParameters: '--conf spark.driver.memory=512M --conf spark.kubernetes.driver.request.cores=0.2 --conf spark.kubernetes.executor.request.cores=0.2 --conf spark.sql.shuffle.partitions=60 --conf spark.dynamicAllocation.enabled=false',
        },
    },
    monitoring: {
        logging: true,
        persistentAppUI: true,
    },
    applicationConfig: [{
            classification: aws_stepfunctions_tasks_1.Classification.SPARK_DEFAULTS,
            properties: {
                'spark.executor.instances': '1',
                'spark.executor.memory': '512M',
            },
        }],
    resultPath: '$.job',
});
const deleteVirtualCluster = new aws_stepfunctions_tasks_1.EmrContainersDeleteVirtualCluster(stack, 'Delete a Virtual Cluster', {
    virtualClusterId: sfn.TaskInput.fromJsonPathAt('$.job.VirtualClusterId'),
});
const chain = sfn.Chain
    .start(createVirtualCluster)
    .next(startJobRun)
    .next(deleteVirtualCluster);
const sm = new sfn.StateMachine(stack, 'StateMachine', {
    definition: chain,
    timeout: cdk.Duration.minutes(20),
});
new cdk.CfnOutput(stack, 'stateMachineArn', {
    value: sm.stateMachineArn,
});
new integ.IntegTest(app, 'aws-stepfunctions-tasks-emr-containers-all-services', {
    testCases: [stack],
    cdkCommandOptions: {
        deploy: {
            args: {
                rollback: true,
            },
        },
    },
});
app.synth();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaW50ZWcuam9iLXN1Ym1pc3Npb24td29ya2Zsb3cuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJpbnRlZy5qb2Itc3VibWlzc2lvbi13b3JrZmxvdy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDJDQUEyQztBQUMzQywyQ0FBMkM7QUFDM0MsMkNBQTJDO0FBQzNDLHFEQUFxRDtBQUNyRCxtQ0FBbUM7QUFDbkMsb0RBQW9EO0FBQ3BELGlGQUc2QztBQUU3Qzs7Ozs7Ozs7O0dBU0c7QUFFSCxNQUFNLEdBQUcsR0FBRyxJQUFJLEdBQUcsQ0FBQyxHQUFHLEVBQUUsQ0FBQztBQUMxQixNQUFNLEtBQUssR0FBRyxJQUFJLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxFQUFFLDBEQUEwRCxDQUFDLENBQUM7QUFFN0YsTUFBTSxVQUFVLEdBQUcsSUFBSSxHQUFHLENBQUMsT0FBTyxDQUFDLEtBQUssRUFBRSw4QkFBOEIsRUFBRTtJQUN4RSxPQUFPLEVBQUUsR0FBRyxDQUFDLGlCQUFpQixDQUFDLEtBQUs7SUFDcEMsZUFBZSxFQUFFLENBQUM7SUFDbEIsdUJBQXVCLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxFQUFFLENBQUMsR0FBRyxDQUFDLGFBQWEsQ0FBQyxFQUFFLEVBQUUsR0FBRyxDQUFDLFlBQVksQ0FBQyxNQUFNLENBQUM7Q0FDNUYsQ0FBQyxDQUFDO0FBRUgsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLEdBQUcsQ0FBQyxJQUFJLENBQUMsS0FBSyxFQUFFLGtCQUFrQixFQUFFO0lBQy9ELFNBQVMsRUFBRSxJQUFJLEdBQUcsQ0FBQyxrQkFBa0IsQ0FDbkMsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsOEJBQThCLENBQUMsRUFDeEQsSUFBSSxHQUFHLENBQUMsZ0JBQWdCLENBQUMsc0JBQXNCLENBQUMsQ0FDakQ7Q0FDRixDQUFDLENBQUM7QUFFSCxNQUFNLG9CQUFvQixHQUFHLElBQUksMkRBQWlDLENBQUMsS0FBSyxFQUFFLDBCQUEwQixFQUFFO0lBQ3BHLGtCQUFrQixFQUFFLHNCQUFzQjtJQUMxQyxVQUFVLEVBQUUseUNBQWUsQ0FBQyxXQUFXLENBQUMsVUFBVSxDQUFDO0lBQ25ELFVBQVUsRUFBRSxXQUFXO0NBQ3hCLENBQUMsQ0FBQztBQUVILE1BQU0sV0FBVyxHQUFHLElBQUksa0RBQXdCLENBQUMsS0FBSyxFQUFFLGlCQUFpQixFQUFFO0lBQ3pFLGNBQWMsRUFBRSw2Q0FBbUIsQ0FBQyxhQUFhLENBQUMsR0FBRyxDQUFDLFNBQVMsQ0FBQyxjQUFjLENBQUMsY0FBYyxDQUFDLENBQUM7SUFDL0YsWUFBWSxFQUFFLHNDQUFZLENBQUMsU0FBUztJQUNwQyxPQUFPLEVBQUUsb0JBQW9CO0lBQzdCLGFBQWEsRUFBRSxHQUFHLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxLQUFLLEVBQUUsb0JBQW9CLEVBQUUsZ0JBQWdCLENBQUMsT0FBTyxDQUFDO0lBQzFGLFNBQVMsRUFBRTtRQUNULG9CQUFvQixFQUFFO1lBQ3BCLFVBQVUsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyx1REFBdUQsQ0FBQztZQUMzRixtQkFBbUIsRUFBRSxHQUFHLENBQUMsU0FBUyxDQUFDLFVBQVUsQ0FBQyxDQUFDLEdBQUcsQ0FBQyxDQUFDO1lBQ3BELHFCQUFxQixFQUFFLHlOQUF5TjtTQUNqUDtLQUNGO0lBQ0QsVUFBVSxFQUFFO1FBQ1YsT0FBTyxFQUFFLElBQUk7UUFDYixlQUFlLEVBQUUsSUFBSTtLQUN0QjtJQUNELGlCQUFpQixFQUFFLENBQUM7WUFDbEIsY0FBYyxFQUFFLHdDQUFjLENBQUMsY0FBYztZQUM3QyxVQUFVLEVBQUU7Z0JBQ1YsMEJBQTBCLEVBQUUsR0FBRztnQkFDL0IsdUJBQXVCLEVBQUUsTUFBTTthQUNoQztTQUNGLENBQUM7SUFDRixVQUFVLEVBQUUsT0FBTztDQUNwQixDQUFDLENBQUM7QUFHSCxNQUFNLG9CQUFvQixHQUFHLElBQUksMkRBQWlDLENBQUMsS0FBSyxFQUFFLDBCQUEwQixFQUFFO0lBQ3BHLGdCQUFnQixFQUFFLEdBQUcsQ0FBQyxTQUFTLENBQUMsY0FBYyxDQUFDLHdCQUF3QixDQUFDO0NBQ3pFLENBQUMsQ0FBQztBQUVILE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLO0tBQ3BCLEtBQUssQ0FBQyxvQkFBb0IsQ0FBQztLQUMzQixJQUFJLENBQUMsV0FBVyxDQUFDO0tBQ2pCLElBQUksQ0FBQyxvQkFBb0IsQ0FBQyxDQUFDO0FBRTlCLE1BQU0sRUFBRSxHQUFHLElBQUksR0FBRyxDQUFDLFlBQVksQ0FBQyxLQUFLLEVBQUUsY0FBYyxFQUFFO0lBQ3JELFVBQVUsRUFBRSxLQUFLO0lBQ2pCLE9BQU8sRUFBRSxHQUFHLENBQUMsUUFBUSxDQUFDLE9BQU8sQ0FBQyxFQUFFLENBQUM7Q0FDbEMsQ0FBQyxDQUFDO0FBRUgsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxpQkFBaUIsRUFBRTtJQUMxQyxLQUFLLEVBQUUsRUFBRSxDQUFDLGVBQWU7Q0FDMUIsQ0FBQyxDQUFDO0FBRUgsSUFBSSxLQUFLLENBQUMsU0FBUyxDQUFDLEdBQUcsRUFBRSxxREFBcUQsRUFBRTtJQUM5RSxTQUFTLEVBQUUsQ0FBQyxLQUFLLENBQUM7SUFDbEIsaUJBQWlCLEVBQUU7UUFDakIsTUFBTSxFQUFFO1lBQ04sSUFBSSxFQUFFO2dCQUNKLFFBQVEsRUFBRSxJQUFJO2FBQ2Y7U0FDRjtLQUNGO0NBQ0YsQ0FBQyxDQUFDO0FBRUgsR0FBRyxDQUFDLEtBQUssRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZWMyIGZyb20gJ2F3cy1jZGstbGliL2F3cy1lYzInO1xuaW1wb3J0ICogYXMgZWtzIGZyb20gJ2F3cy1jZGstbGliL2F3cy1la3MnO1xuaW1wb3J0ICogYXMgaWFtIGZyb20gJ2F3cy1jZGstbGliL2F3cy1pYW0nO1xuaW1wb3J0ICogYXMgc2ZuIGZyb20gJ2F3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zJztcbmltcG9ydCAqIGFzIGNkayBmcm9tICdhd3MtY2RrLWxpYic7XG5pbXBvcnQgKiBhcyBpbnRlZyBmcm9tICdAYXdzLWNkay9pbnRlZy10ZXN0cy1hbHBoYSc7XG5pbXBvcnQge1xuICBDbGFzc2lmaWNhdGlvbiwgVmlydHVhbENsdXN0ZXJJbnB1dCwgRWtzQ2x1c3RlcklucHV0LCBFbXJDb250YWluZXJzRGVsZXRlVmlydHVhbENsdXN0ZXIsXG4gIEVtckNvbnRhaW5lcnNDcmVhdGVWaXJ0dWFsQ2x1c3RlciwgRW1yQ29udGFpbmVyc1N0YXJ0Sm9iUnVuLCBSZWxlYXNlTGFiZWwsXG59IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zdGVwZnVuY3Rpb25zLXRhc2tzJztcblxuLyoqXG4gKiBTdGFjayB2ZXJpZmljYXRpb24gc3RlcHM6XG4gKiBFdmVyeXRoaW5nIGluIHRoZSBsaW5rcyBiZWxvdyBtdXN0IGJlIHNldHVwIGZvciB0aGUgRUtTIENsdXN0ZXIgYW5kIEV4ZWN1dGlvbiBSb2xlIGJlZm9yZSBydW5uaW5nIHRoZSBzdGF0ZSBtYWNoaW5lLlxuICogQHNlZSBodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vZW1yL2xhdGVzdC9FTVItb24tRUtTLURldmVsb3BtZW50R3VpZGUvc2V0dGluZy11cC1jbHVzdGVyLWFjY2Vzcy5odG1sXG4gKiBAc2VlIGh0dHBzOi8vZG9jcy5hd3MuYW1hem9uLmNvbS9lbXIvbGF0ZXN0L0VNUi1vbi1FS1MtRGV2ZWxvcG1lbnRHdWlkZS9zZXR0aW5nLXVwLWVuYWJsZS1JQU0uaHRtbFxuICogQHNlZSBodHRwczovL2RvY3MuYXdzLmFtYXpvbi5jb20vZW1yL2xhdGVzdC9FTVItb24tRUtTLURldmVsb3BtZW50R3VpZGUvc2V0dGluZy11cC10cnVzdC1wb2xpY3kuaHRtbFxuICpcbiAqIGF3cyBzdGVwZnVuY3Rpb25zIHN0YXJ0LWV4ZWN1dGlvbiAtLXN0YXRlLW1hY2hpbmUtYXJuIDxkZXBsb3llZCBzdGF0ZSBtYWNoaW5lIGFybj4gOiBzaG91bGQgcmV0dXJuIGV4ZWN1dGlvbiBhcm5cbiAqIGF3cyBzdGVwZnVuY3Rpb25zIGRlc2NyaWJlLWV4ZWN1dGlvbiAtLWV4ZWN1dGlvbi1hcm4gPGV4ZWN0aW9uLWFybiBnZW5lcmF0ZWQgYmVmb3JlPiA6IHNob3VsZCByZXR1cm4gc3RhdHVzIGFzIFNVQ0NFRURFRFxuICovXG5cbmNvbnN0IGFwcCA9IG5ldyBjZGsuQXBwKCk7XG5jb25zdCBzdGFjayA9IG5ldyBjZGsuU3RhY2soYXBwLCAnYXdzLXN0ZXBmdW5jdGlvbnMtdGFza3MtZW1yLWNvbnRhaW5lcnMtYWxsLXNlcnZpY2VzLXRlc3QnKTtcblxuY29uc3QgZWtzQ2x1c3RlciA9IG5ldyBla3MuQ2x1c3RlcihzdGFjaywgJ2ludGVncmF0aW9uLXRlc3QtZWtzLWNsdXN0ZXInLCB7XG4gIHZlcnNpb246IGVrcy5LdWJlcm5ldGVzVmVyc2lvbi5WMV8yMSxcbiAgZGVmYXVsdENhcGFjaXR5OiAzLFxuICBkZWZhdWx0Q2FwYWNpdHlJbnN0YW5jZTogZWMyLkluc3RhbmNlVHlwZS5vZihlYzIuSW5zdGFuY2VDbGFzcy5NNSwgZWMyLkluc3RhbmNlU2l6ZS5YTEFSR0UpLFxufSk7XG5cbmNvbnN0IGpvYkV4ZWN1dGlvblJvbGUgPSBuZXcgaWFtLlJvbGUoc3RhY2ssICdKb2JFeGVjdXRpb25Sb2xlJywge1xuICBhc3N1bWVkQnk6IG5ldyBpYW0uQ29tcG9zaXRlUHJpbmNpcGFsKFxuICAgIG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnZW1yLWNvbnRhaW5lcnMuYW1hem9uYXdzLmNvbScpLFxuICAgIG5ldyBpYW0uU2VydmljZVByaW5jaXBhbCgnc3RhdGVzLmFtYXpvbmF3cy5jb20nKSxcbiAgKSxcbn0pO1xuXG5jb25zdCBjcmVhdGVWaXJ0dWFsQ2x1c3RlciA9IG5ldyBFbXJDb250YWluZXJzQ3JlYXRlVmlydHVhbENsdXN0ZXIoc3RhY2ssICdDcmVhdGUgYSB2aXJ0dWFsIENsdXN0ZXInLCB7XG4gIHZpcnR1YWxDbHVzdGVyTmFtZTogJ1ZpcnR1YWwtQ2x1c3Rlci1OYW1lJyxcbiAgZWtzQ2x1c3RlcjogRWtzQ2x1c3RlcklucHV0LmZyb21DbHVzdGVyKGVrc0NsdXN0ZXIpLFxuICByZXN1bHRQYXRoOiAnJC5jbHVzdGVyJyxcbn0pO1xuXG5jb25zdCBzdGFydEpvYlJ1biA9IG5ldyBFbXJDb250YWluZXJzU3RhcnRKb2JSdW4oc3RhY2ssICdTdGFydCBhIEpvYiBSdW4nLCB7XG4gIHZpcnR1YWxDbHVzdGVyOiBWaXJ0dWFsQ2x1c3RlcklucHV0LmZyb21UYXNrSW5wdXQoc2ZuLlRhc2tJbnB1dC5mcm9tSnNvblBhdGhBdCgnJC5jbHVzdGVyLklkJykpLFxuICByZWxlYXNlTGFiZWw6IFJlbGVhc2VMYWJlbC5FTVJfNl8yXzAsXG4gIGpvYk5hbWU6ICdFTVItQ29udGFpbmVycy1Kb2InLFxuICBleGVjdXRpb25Sb2xlOiBpYW0uUm9sZS5mcm9tUm9sZUFybihzdGFjaywgJ0pvYi1FeGVjdXRpb24tUm9sZScsIGpvYkV4ZWN1dGlvblJvbGUucm9sZUFybiksXG4gIGpvYkRyaXZlcjoge1xuICAgIHNwYXJrU3VibWl0Sm9iRHJpdmVyOiB7XG4gICAgICBlbnRyeVBvaW50OiBzZm4uVGFza0lucHV0LmZyb21UZXh0KCdsb2NhbDovLy91c3IvbGliL3NwYXJrL2V4YW1wbGVzL3NyYy9tYWluL3B5dGhvbi9waS5weScpLFxuICAgICAgZW50cnlQb2ludEFyZ3VtZW50czogc2ZuLlRhc2tJbnB1dC5mcm9tT2JqZWN0KFsnMiddKSxcbiAgICAgIHNwYXJrU3VibWl0UGFyYW1ldGVyczogJy0tY29uZiBzcGFyay5kcml2ZXIubWVtb3J5PTUxMk0gLS1jb25mIHNwYXJrLmt1YmVybmV0ZXMuZHJpdmVyLnJlcXVlc3QuY29yZXM9MC4yIC0tY29uZiBzcGFyay5rdWJlcm5ldGVzLmV4ZWN1dG9yLnJlcXVlc3QuY29yZXM9MC4yIC0tY29uZiBzcGFyay5zcWwuc2h1ZmZsZS5wYXJ0aXRpb25zPTYwIC0tY29uZiBzcGFyay5keW5hbWljQWxsb2NhdGlvbi5lbmFibGVkPWZhbHNlJyxcbiAgICB9LFxuICB9LFxuICBtb25pdG9yaW5nOiB7XG4gICAgbG9nZ2luZzogdHJ1ZSxcbiAgICBwZXJzaXN0ZW50QXBwVUk6IHRydWUsXG4gIH0sXG4gIGFwcGxpY2F0aW9uQ29uZmlnOiBbe1xuICAgIGNsYXNzaWZpY2F0aW9uOiBDbGFzc2lmaWNhdGlvbi5TUEFSS19ERUZBVUxUUyxcbiAgICBwcm9wZXJ0aWVzOiB7XG4gICAgICAnc3BhcmsuZXhlY3V0b3IuaW5zdGFuY2VzJzogJzEnLFxuICAgICAgJ3NwYXJrLmV4ZWN1dG9yLm1lbW9yeSc6ICc1MTJNJyxcbiAgICB9LFxuICB9XSxcbiAgcmVzdWx0UGF0aDogJyQuam9iJyxcbn0pO1xuXG5cbmNvbnN0IGRlbGV0ZVZpcnR1YWxDbHVzdGVyID0gbmV3IEVtckNvbnRhaW5lcnNEZWxldGVWaXJ0dWFsQ2x1c3RlcihzdGFjaywgJ0RlbGV0ZSBhIFZpcnR1YWwgQ2x1c3RlcicsIHtcbiAgdmlydHVhbENsdXN0ZXJJZDogc2ZuLlRhc2tJbnB1dC5mcm9tSnNvblBhdGhBdCgnJC5qb2IuVmlydHVhbENsdXN0ZXJJZCcpLFxufSk7XG5cbmNvbnN0IGNoYWluID0gc2ZuLkNoYWluXG4gIC5zdGFydChjcmVhdGVWaXJ0dWFsQ2x1c3RlcilcbiAgLm5leHQoc3RhcnRKb2JSdW4pXG4gIC5uZXh0KGRlbGV0ZVZpcnR1YWxDbHVzdGVyKTtcblxuY29uc3Qgc20gPSBuZXcgc2ZuLlN0YXRlTWFjaGluZShzdGFjaywgJ1N0YXRlTWFjaGluZScsIHtcbiAgZGVmaW5pdGlvbjogY2hhaW4sXG4gIHRpbWVvdXQ6IGNkay5EdXJhdGlvbi5taW51dGVzKDIwKSxcbn0pO1xuXG5uZXcgY2RrLkNmbk91dHB1dChzdGFjaywgJ3N0YXRlTWFjaGluZUFybicsIHtcbiAgdmFsdWU6IHNtLnN0YXRlTWFjaGluZUFybixcbn0pO1xuXG5uZXcgaW50ZWcuSW50ZWdUZXN0KGFwcCwgJ2F3cy1zdGVwZnVuY3Rpb25zLXRhc2tzLWVtci1jb250YWluZXJzLWFsbC1zZXJ2aWNlcycsIHtcbiAgdGVzdENhc2VzOiBbc3RhY2tdLFxuICBjZGtDb21tYW5kT3B0aW9uczoge1xuICAgIGRlcGxveToge1xuICAgICAgYXJnczoge1xuICAgICAgICByb2xsYmFjazogdHJ1ZSxcbiAgICAgIH0sXG4gICAgfSxcbiAgfSxcbn0pO1xuXG5hcHAuc3ludGgoKTtcbiJdfQ==