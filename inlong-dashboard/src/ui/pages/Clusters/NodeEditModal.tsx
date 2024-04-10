/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import React, { useMemo } from 'react';
import i18n from '@/i18n';
import { Modal, message } from 'antd';
import { ModalProps } from 'antd/es/modal';
import FormGenerator, { useForm } from '@/ui/components/FormGenerator';
import { useRequest, useUpdateEffect } from '@/ui/hooks';
import request from '@/core/utils/request';
import rulesPattern from '@/core/utils/pattern';

export interface NodeEditModalProps extends ModalProps {
  id?: number;
  type: string;
  clusterId: number;
}

const NodeEditModal: React.FC<NodeEditModalProps> = ({ id, type, clusterId, ...modalProps }) => {
  const [form] = useForm();

  const { data: savedData, run: getData } = useRequest(
    id => ({
      url: `/cluster/node/get/${id}`,
    }),
    {
      manual: true,
      onSuccess: result => {
        if (type === 'AGENT') {
          // Only keep the first element and give the rest to the 'installer'
          result.installer = result?.moduleIdList.slice(1);
          result.moduleIdList = result?.moduleIdList.slice(0, 1);
        }
        form.setFieldsValue(result);
      },
    },
  );

  const onOk = async () => {
    const values = await form.validateFields();
    const isUpdate = id;
    const submitData = {
      ...values,
      type,
      parentId: savedData?.parentId || clusterId,
    };
    if (isUpdate) {
      submitData.id = id;
      submitData.version = savedData?.version;
    }
    if (type === 'AGENT') {
      if (submitData.installer !== undefined) {
        submitData.moduleIdList = submitData.moduleIdList.concat(submitData.installer);
      }
      if (isUpdate === undefined) {
        submitData.isInstall = true;
      }
    }
    await request({
      url: `/cluster/node/${isUpdate ? 'update' : 'save'}`,
      method: 'POST',
      data: submitData,
    });
    await modalProps?.onOk(submitData);
    message.success(i18n.t('basic.OperatingSuccess'));
  };

  useUpdateEffect(() => {
    if (modalProps.open) {
      // open
      form.resetFields();
      if (id) {
        getData(id);
      }
    }
  }, [modalProps.open]);

  const content = useMemo(() => {
    return [
      {
        type: 'input',
        label: 'IP',
        name: 'ip',
        rules: [
          {
            pattern: rulesPattern.ip,
            message: i18n.t('pages.Clusters.Node.IpRule'),
          },
        ],
      },
      {
        type: 'inputnumber',
        label: i18n.t('pages.Clusters.Node.Port'),
        name: 'port',
        rules: [
          {
            pattern: rulesPattern.port,
            message: i18n.t('pages.Clusters.Node.PortRule'),
          },
        ],
        props: {
          min: 0,
          max: 65535,
        },
      },
      {
        type: 'radio',
        label: i18n.t('pages.Clusters.Node.Online'),
        name: 'enabledOnline',
        initialValue: true,
        hidden: type !== 'DATAPROXY',
        rules: [{ required: true }],
        props: {
          options: [
            {
              label: i18n.t('basic.Yes'),
              value: true,
            },
            {
              label: i18n.t('basic.No'),
              value: false,
            },
          ],
        },
      },
      {
        type: 'select',
        label: i18n.t('pages.Clusters.Node.ProtocolType'),
        name: 'protocolType',
        initialValue: 'HTTP',
        rules: [{ required: true }],
        props: {
          options: [
            {
              label: 'HTTP',
              value: 'HTTP',
            },
            {
              label: 'TCP',
              value: 'TCP',
            },
          ],
        },
      },
      {
        type: 'select',
        label: i18n.t('pages.Clusters.Node.Agent'),
        name: 'moduleIdList',
        hidden: type !== 'AGENT',
        props: {
          options: {
            requestAuto: true,
            requestTrigger: ['onOpen'],
            requestService: keyword => ({
              url: '/module/list',
              method: 'POST',
              data: {
                keyword,
                pageNum: 1,
                pageSize: 9999,
              },
            }),
            requestParams: {
              formatResult: result =>
                result?.list
                  ?.filter(item => item.type === 'AGENT')
                  .map(item => ({
                    ...item,
                    label: `${item.name} ${item.version}`,
                    value: item.id,
                  })),
            },
          },
        },
      },
      {
        type: 'select',
        label: i18n.t('pages.Clusters.Node.AgentInstaller'),
        name: 'installer',
        hidden: type !== 'AGENT',
        props: {
          mode: 'multiple',
          options: {
            requestAuto: true,
            requestTrigger: ['onOpen'],
            requestService: keyword => ({
              url: '/module/list',
              method: 'POST',
              data: {
                keyword,
                pageNum: 1,
                pageSize: 9999,
              },
            }),
            requestParams: {
              formatResult: result =>
                result?.list
                  ?.filter(item => item.type === 'INSTALLER')
                  .map(item => ({
                    ...item,
                    label: `${item.name} ${item.version}`,
                    value: item.id,
                  })),
            },
          },
        },
      },
      {
        type: 'textarea',
        label: i18n.t('pages.Clusters.Description'),
        name: 'description',
        props: {
          maxLength: 256,
        },
      },
    ];
  }, []);

  return (
    <Modal {...modalProps} title={i18n.t('pages.Clusters.Node.Name')} onOk={onOk}>
      <FormGenerator content={content} form={form} useMaxWidth />
    </Modal>
  );
};

export default NodeEditModal;
